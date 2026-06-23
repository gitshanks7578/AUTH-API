import express from "express"
import { login, registerUser,logout,refresh, request_password_reset, reset_password, request_email_verification, verify_email,invalidateAllSessions,verify2FA, getTwoFASecret, googleCallbackController} from "../controller/auth.controller.js"
import { verifyJWT } from "../middlewares/verifyJWT.js"
import { commonRateLimiter } from "../middlewares/rateLimit.js"
import passport from "../config/passport.js"

const authrouter = express.Router()

authrouter.post("/register",commonRateLimiter(5,15),registerUser)
// authrouter.post("/totp",getTotp)
// authrouter.post("/login",commonRateLimiter(5,15),login)
authrouter.post("/login",commonRateLimiter(5,15),login)
authrouter.post("/verify2FA",verifyJWT,verify2FA)
authrouter.post("/logout",verifyJWT,logout)
authrouter.post("/refresh",refresh)

authrouter.post("/password_reset",commonRateLimiter(5,15),request_password_reset)
authrouter.post("/reset-password",reset_password)

authrouter.post("/invalidate-all", verifyJWT, invalidateAllSessions);
authrouter.post("/get2fasecret",verifyJWT,getTwoFASecret)

authrouter.post("/request_verify",commonRateLimiter(5,15),verifyJWT,request_email_verification)
authrouter.post("/verify-email",verifyJWT,verify_email)

//google oAuth
authrouter.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
  }))
authrouter.get("/google/callback", passport.authenticate("google", {
    session: false,
  }),
  googleCallbackController)

export default authrouter
