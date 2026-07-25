
import { RateLimiterRedis } from "rate-limiter-flexible";
import { client } from "../utils/redis.js";
import { logAuditEvent } from "../utils/auditLogs.js";

const createRateLimiter = ({
  points,
  duration,
  keyPrefix,
  keyGenerator,
}) => {
  if(process.env.NODE_ENV === "test"){
     return (req, res, next) => next();
  }
  const limiter = new RateLimiterRedis({
    storeClient: client,
    // This app uses the `redis` (node-redis) package, not ioredis. Without
    // this, rate-limiter-flexible attempts to call ioredis-only commands.
    useRedisPackage: true,
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
      // A rejected consume has rate-limit metadata. Connection and Redis errors
      // do not, and must not be presented to clients as a 429 response.
      if (!rateLimiterRes || typeof rateLimiterRes.msBeforeNext !== "number") {
        const error = new Error("Rate-limit service is unavailable");
        error.statusCode = 503;
        error.cause = rateLimiterRes;
        return next(error);
      }

      try {
        await logAuditEvent({
          userId: req.USER?.userID || null,
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
    // Keep each public endpoint in its own bucket for a given IP address.
    keyGenerator: (req) => `${req.ip}:${req.baseUrl}${req.path}`,
  });

export const userRateLimiter = (points, duration) =>
  createRateLimiter({
    points,
    duration,
    keyPrefix: "user_limit",
    // Keep each protected endpoint in its own bucket for a given user.
    keyGenerator: (req) =>
      `${req.USER.userID.toString()}:${req.baseUrl}${req.path}`,
  });
