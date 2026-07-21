// // middlewares/rateLimiter.js
// import rateLimit from "express-rate-limit";
// import { logAuditEvent } from "../utils/auditLogs.js";
// import { user } from "../models/user.model.js";

// export const commonRateLimiter = (maxRequests = 5, windowMinutes = 15) => {
//   return rateLimit({
//     windowMs: windowMinutes * 60 * 1000,
//     max: maxRequests,
//     standardHeaders: true,
//     legacyHeaders: false,
//     handler: async function (req, res) {
//       let userId = null;

//       if (req.body && req.body.email) {
//         const existingUser = await user
//           .findOne({ email: req.body.email })
//           .select("_id");
//         if (existingUser) userId = existingUser._id;
//       }

//       await logAuditEvent({
//         userId,
//         action: "RATE_LIMIT_HIT",
//         success: false,
//         reason: `Exceeded ${maxRequests} requests per ${windowMinutes} minutes`,
//         req,
//       });

//       return res.status(429).json({
//         success: false,
//         message: `Too many requests, try again after ${windowMinutes} minutes`,
//       });
//     },
//   });
// };


import { RateLimiterRedis } from "rate-limiter-flexible";
import { client } from "../utils/redis.js";
import { logAuditEvent } from "../utils/auditLogs.js";

const createRateLimiter = ({
  points,
  duration,
  keyPrefix,
  keyGenerator,
}) => {
  const limiter = new RateLimiterRedis({
    storeClient: client,
    keyPrefix,
    points,
    duration,
  });

  return async (req, res, next) => {
    const key = keyGenerator(req);

    try {
      await limiter.consume(key);
      return next();
    } catch (rateLimiterRes) {
      try {
        await logAuditEvent({
          userId: req.USER.userID || null,
          action: "RATE_LIMIT_HIT",
          success: false,
          reason: `Exceeded ${points} requests in ${duration} seconds`,
          req,
        });
      } catch (err) {
        console.error("Audit log failed:", err);
      }

      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(rateLimiterRes.msBeforeNext / 1000),
      });
    }
  };
};

export const ipRateLimiter = (points, duration) =>
  createRateLimiter({
    points,
    duration,
    keyPrefix: "ip_limit",
    keyGenerator: (req) => req.ip,
  });

export const userRateLimiter = (points, duration) =>
  createRateLimiter({
    points,
    duration,
    keyPrefix: "user_limit",
    keyGenerator: (req) => req.USER.userID.toString(),
  });