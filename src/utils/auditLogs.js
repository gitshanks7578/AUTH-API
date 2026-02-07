// utils/auditLogger.js
import { auditLog } from "../models/auditLogs.model.js";

export const logAuditEvent = async ({
  userId = null,
  action,
  success,
  reason = null,
  req,
}) => {
  try {
    await auditLog.create({
      user: userId,
      action,
      success,
      reason,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err) {
    // Never block auth flow
    console.error("Audit log failed:", err.message);
  }
};
