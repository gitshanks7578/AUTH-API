import speakeasy from "speakeasy";
import { logAuditEvent } from "./auditLogs.js";
import ApiError from "./apiError.js";
export const run2FA = async ({ user, token, req }) => {
  if (!user.twoFAEnabled) return; // skip if 2FA not enabled

  if (!token) {
    await logAuditEvent({
      userId: user._id,
      action: "LOGIN_2FA_FAILED",
      success: false,
      reason: "2FA token missing",
      req,
    });
    throw new Error("2FA token required");
  }
//   throw new ApiError(`${token} and ${user.twoFASecret}`)
console.log(
  "Backend expects OTP:",
  speakeasy.totp({ secret: user.twoFASecret, encoding: "base32" })
);
  const isValid = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token,
    window: 2, // ±30s tolerance
  });
  console.log(isValid)
//   throw new ApiError(`STOP`)
  if (!isValid) {
    await logAuditEvent({
      userId: user._id,
      action: "LOGIN_2FA_FAILED",
      success: false,
      reason: "Invalid 2FA code",
      req,
    });
    throw new Error("Invalid 2FA code");
  }

  await logAuditEvent({
    userId: user._id,
    action: "LOGIN_2FA_SUCCESS",
    success: true,
    reason: "",
    req,
  });
};
