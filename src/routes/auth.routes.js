import express from "express"
import { login, registerUser,logout,refresh, request_password_reset, reset_password, request_email_verification, verify_email,invalidateAllSessions } from "../controller/auth.controller.js"
import { verifyJWT } from "../middlewares/verifyJWT.js"
import { commonRateLimiter } from "../middlewares/rateLimit.js"
const authrouter = express.Router()

authrouter.post("/register",registerUser)
// authrouter.post("/login",commonRateLimiter(5,15),login)
authrouter.post("/login",login)
authrouter.post("/logout",verifyJWT,logout)
authrouter.post("/refresh",refresh)
authrouter.post("/password_reset",commonRateLimiter(5,15),request_password_reset)
authrouter.post("/reset-password",reset_password)
authrouter.post("/invalidate-all", verifyJWT, invalidateAllSessions);


authrouter.post("/request_verify",commonRateLimiter(5,15),request_email_verification)
authrouter.post("/verify-email",verify_email)

export default authrouter