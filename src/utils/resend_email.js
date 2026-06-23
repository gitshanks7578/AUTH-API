import { Resend } from 'resend';
import ApiError from './apiError.js';
import dotenv from "dotenv"
dotenv.config()
const resend = new Resend(`${process.env.RESEND_API_KEY}`);

export const sendMailForPassword = async (email, otp) => {
    try {
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: `${email}`,
            subject: 'password reset OTP',
            html: ` <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:20px;">
    <div style="max-width:420px; margin:auto; background:white; padding:24px; border-radius:10px; border:1px solid #eee;">
      
      <h2 style="margin:0 0 10px; color:#111;">Your OTP Code</h2>
      
      <p style="color:#555; font-size:14px;">
        Use the following OTP to complete your verification. It is valid for 5 minutes.
      </p>

      <div style="
        margin:20px 0;
        font-size:28px;
        letter-spacing:6px;
        font-weight:bold;
        text-align:center;
        background:#f3f4f6;
        padding:12px;
        border-radius:8px;
        color:#111;
      ">
        ${otp}
      </div>

      <p style="color:#888; font-size:12px;">
        If you did not request this, ignore this email.
      </p>

    </div>
  </div></p>`
        });
        console.log(result)
        console.log(`${process.env.RESEND_API_KEY}`, "TRUE")
        return true;
    } catch (error) {
        throw new ApiError("resend mailer failed",500)
    }


}



export const sendMailForEmail = async (email, otp) => {
    try {
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: `${email}`,
            subject: 'email verification OTP',
            html: ` <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:20px;">
    <div style="max-width:420px; margin:auto; background:white; padding:24px; border-radius:10px; border:1px solid #eee;">
      
      <h2 style="margin:0 0 10px; color:#111;">Your OTP Code</h2>
      
      <p style="color:#555; font-size:14px;">
        Use the following OTP to complete your verification. It is valid for 5 minutes.
      </p>

      <div style="
        margin:20px 0;
        font-size:28px;
        letter-spacing:6px;
        font-weight:bold;
        text-align:center;
        background:#f3f4f6;
        padding:12px;
        border-radius:8px;
        color:#111;
      ">
        ${otp}
      </div>

      <p style="color:#888; font-size:12px;">
        If you did not request this, ignore this email.
      </p>

    </div>
  </div></p>`
        });
        console.log(result)
        console.log(`${process.env.RESEND_API_KEY}`, "TRUE")
        return true;
    } catch (error) {
        throw new ApiError("resend mailer failed",500)
    }


}