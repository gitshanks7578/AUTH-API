// middlewares/rateLimiter.js
import rateLimit from "express-rate-limit";
import { logAuditEvent } from "../utils/auditLogs.js";
import { user } from "../models/user.model.js";

export const commonRateLimiter = (maxRequests = 5, windowMinutes = 15) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: async function (req, res) {
      let userId = null;

      if (req.body && req.body.email) {
        const existingUser = await user
          .findOne({ email: req.body.email })
          .select("_id");
        if (existingUser) userId = existingUser._id;
      }

      await logAuditEvent({
        userId,
        action: "RATE_LIMIT_HIT",
        success: false,
        reason: `Exceeded ${maxRequests} requests per ${windowMinutes} minutes`,
        req,
      });

      return res.status(429).json({
        success: false,
        message: `Too many requests, try again after ${windowMinutes} minutes`,
      });
    },
  });
};
