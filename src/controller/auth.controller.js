import ApiError from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { user } from "../models/user.model.js";
import crypto from "crypto";
import { session } from "../models/session.model.js";
import { refreshToken } from "../models/refreshToken.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/tokenGenerator.js";
import jwt from "jsonwebtoken";

import { logAuditEvent } from "../utils/auditLogs.js";
import speakeasy from "speakeasy";

import { run2FA } from "../utils/2FA.js";
import { LoginChallenge } from "../models/login_challenges.js";

import { sendMailForEmail, sendMailForPassword } from "../utils/resend_email.js";

function hash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}



export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      throw new ApiError("all fields are required", 400);
    const existingUser = await user.findOne({ email });
    if (existingUser) throw new ApiError("user already exists", 409);

    const newUser = await user.create({
      name,
      email,
      password,
      role: "user",
      twoFASecret: speakeasy.generateSecret({ length: 20 }).base32, // auto-generate
      twoFAEnabled: false,
    });
    await logAuditEvent({
      userId: newUser._id,
      action: "REGISTRATION SUCCESS",
      success: true,
      reason: "",
      req,
    });
    return apiResponse(
      res,
      {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      "user registered successfully",
      201,
    );
  } catch (err) {
    next(err);
  }
};

export const getTwoFASecret = async (req, res, next) => {
  try {
    const existing_user = await user.findById(req.USER.userID)
    if (!existing_user) {
      throw new ApiError("user not found", 404)
    }
    if(existing_user.twoFAEnabled){
      throw new ApiError("cannot get secret 2fa already enabled",400)
    }
    return apiResponse(res, { twofa_secret: existing_user.twoFASecret }, "secret provided successfully", 200)
  } catch (error) {
    next(error)
  }
}

export const verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body
    const userid = req.USER.userID
    if (!userid || !token) {
      throw new ApiError("token required", 400);
    }

    const existingUser = await user.findById(userid);
    if (!existingUser) {
      throw new ApiError("user not found", 404);
    }

    const isValid = speakeasy.totp.verify({
      secret: existingUser.twoFASecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!isValid) {
      throw new ApiError("invalid TOTP", 400);
    }

    existingUser.twoFAEnabled = true;
    await existingUser.save();

    return apiResponse(res, {}, "2FA enabled successfully", 200);

  } catch (err) {
    next(err)
  }
}


export const login = async (req, res, next) => {
  try {
    const { email, password, totp } = req.body;
    if (!email || !password) throw new ApiError("all fields required", 400);
    const existingUser = await user.findOne({ email });
    // const existingUser = await user.findOne({ email }).select("-password");
    if (!existingUser) {
      await logAuditEvent({
        action: "LOGIN_FAILED",
        success: false,
        reason: "Invalid credentials || user wasnt found",
        req,
      });
      throw new ApiError("user doesnt exist,register first", 404);
    }
    //check password
    if (existingUser.authProvider === "google") {
      throw new ApiError("please sign in via google", 400)
    }
    const isPasswordCorrect = await existingUser.comparePassword(password);
    if (!isPasswordCorrect) {
      await logAuditEvent({
        userId: existingUser._id,
        action: "LOGIN_FAILED",
        success: false,
        reason: "Invalid credentials || incorrect password",
        req,
      });
      throw new ApiError("invalid password", 400);
    }
    //2FA
    await run2FA({ user: existingUser, token: totp, req });
    //req for IP and user-agent


    //create session
    const newSession = await session.create({
      user: existingUser._id,
      userAgent: req.headers["user-agent"],
      valid: true,
    });

    //generate tokens
    const accessToken = generateAccessToken({
      sessionID: newSession._id,
      userID: existingUser._id,
      role: existingUser.role,
    });
    const currentRefreshToken = generateRefreshToken({
      sessionID: newSession._id,
    });

    //create refreshtoken document
    const newRefreshToken = await refreshToken.create({
      session: newSession._id,
      token: hash(currentRefreshToken),
      valid: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie("refreshToken", currentRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    //return response
    await logAuditEvent({
      userId: existingUser._id,
      action: "LOGIN_SUCCESS",
      success: true,
      reason: "",
      req,
    });
    return apiResponse(
      res,
      { currentRefreshToken, accessToken },
      "Login successful",
      200,
    );
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const existingSession = await session.findByIdAndUpdate(
      req.USER.sessionID,
      { valid: false },
    );
    await refreshToken.updateMany(
      { session: req.USER.sessionID },
      { valid: false },
    );

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    await logAuditEvent({
      userId: req.USER.userID,
      action: "LOGOUT_SUCCESS",
      success: true,
      reason: "",
      req,
    });

    return apiResponse(res, null, "Logged out", 200);
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token =
      req?.cookies.refreshToken ||
      req.header("authorization")?.replace("Bearer ", "");
    if (!token)
      throw new ApiError("refesh token doesnt exist || line 230", 400);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      
    } catch (error) {
      console.log("INSIDE ERROR CATCH")
      console.log(error)
      throw new ApiError("invalid token",401)
    }
    // if(!decoded){
    //   throw new ApiError("invalid refreshtoken",401)
    // }
    const existing_session = await session.findById(decoded?.sessionID);

    const hashedToken = hash(token);
    //checking if refresh token is valid
    const existing_refreshToken = await refreshToken.findOne({
      token: hashedToken,
      valid: true,
    });
    if (!existing_refreshToken || existing_refreshToken.valid === false) {
      await session.findByIdAndUpdate(decoded.sessionID, { valid: false });
      await refreshToken.updateMany(
        { session: decoded.sessionID },
        { valid: false },
      );
      await logAuditEvent({
        userId: existing_session?.user,
        action: "REFRESH TOKEN REUSE DETECTED",
        success: false,
        reason: "probable theft",
        req,
      });
      throw new ApiError(
        "Refresh token reuse detected. Session terminated.",
        401,
      );
    }

    //checking if session linked through token is valid

    if (!existing_session || existing_session.valid === false) {
      await logAuditEvent({
        userId: existing_session?.user,
        action: "REFRESHING TOKEN FAILED",
        success: false,
        reason: "invalid session",
        req,
      });
      throw new ApiError("SESSION EXPIRED", 400);
    }
    const existing_user = await user.findById(existing_session.user);
    if (!existing_user) {
      await session.findByIdAndUpdate(decoded.sessionID, { valid: false });
      await refreshToken.updateMany(
        { session: decoded.sessionID },
        { valid: false },
      );
      throw new ApiError("user linked to session no longer exists", 401);
    }

    //since both exists now we rotate
    existing_refreshToken.valid = false;
    await existing_refreshToken.save();
    //GENERATE NEW TOKEN
    const newRefreshToken = generateRefreshToken({
      sessionID: decoded.sessionID,
    });
    const newAccessToken = generateAccessToken({
      sessionID: decoded.sessionID,
      userID: existing_session.user,
      role: existing_user.role,
    });
    const new_refresh_token = await refreshToken.create({
      session: decoded?.sessionID,
      token: hash(newRefreshToken),
      valid: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAuditEvent({
      userId: existing_user._id,
      action: "REFRESHING TOKEN SUCCESS",
      success: true,
      reason: "",
      req,
    });
    return apiResponse(
      res,
      { newRefreshToken, newAccessToken },
      "rotation successfull",
      200,
    );
  } catch (err) {
    next(err);
  }
};

export const request_password_reset = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError("EMAIL REQUIRED", 400);

    const existing_user = await user.findOne({ email });
    if (!existing_user) {
      await logAuditEvent({
        action: "PASSWORD_RESET_REQUEST_FAILED",
        success: false,
        reason: "email not found",
        req,
      });
      throw new ApiError("user doesnt exist", 400);
    }

    if (existing_user.authProvider === "google") {
      throw new ApiError("google auth provider | cant change password", 400)
    }
    //after checks generate 6 digit otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    //example
    //math.random() --> 0 < x < 1
    //multiply by 900000 -----> 0 ≤ x < 900000
    //add 100000  ---> 100000 < x <= 999999

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    existing_user.passwordResetOTP = hashedOtp;
    existing_user.passwordResetOTPExpires = Date.now() + 10 * 60 * 1000;
    await existing_user.save();

    
    const mailed = await sendMailForPassword(email, otp)
    console.log(mailed)
    if (!mailed) throw new ApiError("email sender failed", 500)

    // const preview_link = result.preview_link
    await logAuditEvent({
      userId: existing_user._id,
      action: "REQUEST FOR PASSWORD RESET || SUCCESS",
      success: true,
      reason: "",
      req,
    });
    return apiResponse(res, {}, "verification otp generated", 200); //DEV ONLY OTP RES
    // res.status(200).json({message : `${otp} , ${preview_link}`,success:true})
  } catch (err) {
    next(err);
  }
};

export const reset_password = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      throw new ApiError("all fields required", 400);

    const existing_user = await user.findOne({ email });
    if (!existing_user)
      throw new ApiError("user not found with the given email", 400);

    if (existing_user.passwordResetOTPExpires < Date.now())
      throw new ApiError("otp expired", 400);
    if (!existing_user.passwordResetOTP)
      throw new ApiError("otp invalid", 400);

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOtp !== existing_user.passwordResetOTP)
      throw new ApiError("otp invalid", 400);

    existing_user.password = newPassword;
    existing_user.passwordResetOTP = undefined;
    existing_user.passwordResetOTPExpires = undefined;
    await existing_user.save();

    return apiResponse(res, {}, "password reset successfully", 200);
  } catch (err) {
    next(err);
  }
};

export const request_email_verification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError("email required", 400);

    const existing_user = await user.findOne({ email });
    if (!existing_user) throw new ApiError("user not found", 404);

    if (existing_user.isEmailVerified)
      throw new ApiError("email already verified", 400);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    existing_user.emailVerificationOTP = hashedOtp;
    existing_user.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 min

    await existing_user.save();
    //send email
    const mailed = await sendMailForEmail(email, otp)
    console.log(mailed)
    if (!mailed) throw new ApiError("email sender failed", 500)

    await logAuditEvent({
      userId: existing_user._id,
      action: "EMAIL_VERIFICATION_REQUEST_SUCCESS",
      success: true,
      reason: "",
      req,
    });
    return apiResponse(res, {}, "verification otp generated", 200); //DEV ONLY OTP RES
  } catch (err) {
    next(err);
  }
};

export const verify_email = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new ApiError("email and otp required", 400);

    const existing_user = await user.findOne({ email });
    if (!existing_user) throw new ApiError("user not found", 404);

    if (
      !existing_user.emailVerificationOTP ||
      existing_user.emailVerificationOTPExpires < Date.now()
    )
      throw new ApiError("otp expired or invalid", 400);

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOtp !== existing_user.emailVerificationOTP)
      throw new ApiError("invalid otp", 400);

    existing_user.isEmailVerified = true;
    existing_user.emailVerificationOTP = undefined;
    existing_user.emailVerificationOTPExpires = undefined;

    await existing_user.save();
    await logAuditEvent({
      userId: existing_user._id,
      action: "EMAIL_VERIFIED",
      success: true,
      req,
    });
    return apiResponse(res, {}, "email verified successfully", 200);
  } catch (err) {
    next(err);
  }
};


export const invalidateAllSessions = async (req, res, next) => {
  try {
    const userId = req.USER.userID;
  
    // Find all valid sessions of the user
    const userSessions = await session.find({ user: userId, valid: true }).select("_id");

    const sessionIds = userSessions.map((s) => s._id);

    if (sessionIds.length === 0) {
      return apiResponse(res, null, "No active sessions to invalidate", 200);
    }

    // Invalidate all sessions
    await session.updateMany(
      { _id: { $in: sessionIds } },
      { valid: false }
    );

    // Invalidate all refresh tokens linked to those sessions
    await refreshToken.updateMany(
      { session: { $in: sessionIds }, valid: true },
      { valid: false }
    );

    // Audit log
    await logAuditEvent({
      userId,
      action: "INVALIDATE_ALL_SESSIONS",
      success: true,
      reason: "",
      req,
    });

    return apiResponse(res, null, "All sessions invalidated successfully", 200);
  } catch (err) {
    next(err);
  }
};



export const googleCallbackController = async (req, res, next) => {
  try {
    const email = req.user.emails[0].value;
    const name = req.user.displayName;
    const googleId = req.user.id;
    const avatar = req.user.photos?.[0]?.value;
    // const {totp} = req.body;
    let existingUser =
      await user.findOne({ email });

    if (!existingUser) {
      existingUser = await user.create({
        name,
        email,
        googleId,
        authProvider: "google",
        avatar,
        isEmailVerified: true,
        twoFASecret: speakeasy.generateSecret({ length: 20 }).base32,
        twoFAEnabled: false,
      });
    }

    // await run2FA({ user: existingUser, token: totp, req });
    //create session

    if (existingUser.twoFAEnabled) {
      await LoginChallenge.deleteMany({
        userId: existingUser._id,
        used: false,
      });
      const challengeId = crypto.randomUUID();

      const login_Challenge = await LoginChallenge.create({
        challengeId,
        userId: existingUser._id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
      })
      return res.status(200).json({
        challengeId, message: "2fa verification required"
      });
    }

    const newSession = await session.create({
      user: existingUser._id,
      userAgent: req.headers["user-agent"],
      valid: true,
    });

    //generate tokens
    const accessToken = generateAccessToken({
      sessionID: newSession._id,
      userID: existingUser._id,
      role: existingUser.role,
    });
    const currentRefreshToken = generateRefreshToken({
      sessionID: newSession._id,
    });

    //create refreshtoken document
    const newRefreshToken = await refreshToken.create({
      session: newSession._id,
      token: hash(currentRefreshToken),
      valid: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie("refreshToken", currentRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    //return response
    await logAuditEvent({
      userId: existingUser._id,
      action: "LOGIN_SUCCESS",
      success: true,
      reason: "",
      req,
    });
    return apiResponse(
      res,
      { currentRefreshToken, accessToken },
      "Login successful",
      200,
    );

  } catch (error) {
    next(error)
  }
}


export const google_verify_2fa = async (req, res, next) => {
  try {
    const { challengeId, totp } = req.body;
    if (!challengeId || !totp) {
      throw new ApiError("VALUES MISSING", 400);
    }

    const login_Challenge = await LoginChallenge.findOne({ challengeId,used : false })
    if (!login_Challenge) {
      throw new ApiError("challenge missing", 401);
    }
    if (login_Challenge.expiresAt < new Date()) {
      throw new ApiError("Challenge expired", 400);
    }
    const existing_user = await user.findById(login_Challenge.userId)
    if (!existing_user) {
      throw new ApiError("User not found", 404);
    }
    
    await run2FA({ user: existing_user, token: totp, req });

    login_Challenge.used = true;
    await login_Challenge.save()

    
    const newSession = await session.create({
      user: existing_user._id,
      userAgent: req.headers["user-agent"],
      valid: true,
    });

    //generate tokens
    const accessToken = generateAccessToken({
      sessionID: newSession._id,
      userID: existing_user._id,
      role: existing_user.role,
    });
    const currentRefreshToken = generateRefreshToken({
      sessionID: newSession._id,
    });

    //create refreshtoken document
    const newRefreshToken = await refreshToken.create({
      session: newSession._id,
      token: hash(currentRefreshToken),
      valid: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie("refreshToken", currentRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    //return response
    await logAuditEvent({
      userId: existing_user._id,
      action: "LOGIN_SUCCESS",
      success: true,
      reason: "",
      req,
    });
    return apiResponse(
      res,
      { currentRefreshToken, accessToken },
      "Login successful",
      200,
    );


  } catch (error) {
    next(error)
  }
}
