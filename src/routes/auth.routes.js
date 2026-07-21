import express from "express"
import { login, registerUser,logout,refresh, request_password_reset, reset_password, request_email_verification, verify_email,invalidateAllSessions,verify2FA, getTwoFASecret, googleCallbackController, google_verify_2fa} from "../controller/auth.controller.js"
import { verifyJWT } from "../middlewares/verifyJWT.js"
import { ipRateLimiter,userRateLimiter } from "../middlewares/rateLimit.js"
import passport from "../config/passport.js"

const authrouter = express.Router()

// Public Routes
authrouter.post("/register", ipRateLimiter(5, 15 * 60), registerUser);
authrouter.post("/login", ipRateLimiter(5, 15 * 60), login);
authrouter.post("/refresh", ipRateLimiter(20, 15 * 60), refresh);

authrouter.post("/password_reset", ipRateLimiter(3, 60 * 60), request_password_reset);
authrouter.post("/reset-password", ipRateLimiter(5, 60 * 60), reset_password);

// Protected Routes
authrouter.post("/get2fasecret", verifyJWT, userRateLimiter(5, 15 * 60), getTwoFASecret);
authrouter.post("/verify2FA", verifyJWT, userRateLimiter(10, 15 * 60), verify2FA);
authrouter.post("/logout", verifyJWT, userRateLimiter(20, 15 * 60), logout);
authrouter.post("/invalidate-all", verifyJWT, userRateLimiter(2, 60 * 60), invalidateAllSessions);
authrouter.post("/request_verify", verifyJWT, userRateLimiter(3, 60 * 60), request_email_verification);
authrouter.post("/verify-email", verifyJWT, userRateLimiter(10, 15 * 60), verify_email);



//google oAuth
authrouter.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
  }))
authrouter.get("/google/callback", passport.authenticate("google", {
    session: false,
  }),
  googleCallbackController)

authrouter.post("/google/verify-2fa",ipRateLimiter(10, 15 * 60),google_verify_2fa)

export default authrouter
