import express from "express"
import { login, registerUser,logout,refresh, request_password_reset, reset_password, request_email_verification, verify_email } from "../controller/auth.controller.js"
import { verifyJWT } from "../middlewares/verifyJWT.js"
const authrouter = express.Router()

authrouter.post("/register",registerUser)
authrouter.post("/login",login)
authrouter.post("/logout",verifyJWT,logout)
authrouter.post("/refresh",refresh)
authrouter.post("/password_reset",request_password_reset)
authrouter.post("/reset-password",reset_password)

authrouter.post("/request_verify",request_email_verification)
authrouter.post("/verify-email",verify_email)

export default authrouter