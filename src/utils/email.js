


// utils/email.js
import nodemailer from "nodemailer";

let testAccount;
let transporter;

// initialize ethereal once
async function initEthereal() {
  if (transporter) return;

  testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log("Ethereal Email Ready");
  console.log("User:", testAccount.user);
  console.log("Pass:", testAccount.pass);


}

export async function sendEmail({ to, subject, htmlContent }) {
  await initEthereal();

  try {
    const info = await transporter.sendMail({
      from: `"Auth API" <no-reply@auth.local>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log("Email sent (Ethereal)");
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    const preview_link = nodemailer.getTestMessageUrl(info);
    
    return {info,preview_link};
  } catch (error) {
    console.error("Ethereal email error:", error);
    throw new Error("Failed to send email");
  }
}


