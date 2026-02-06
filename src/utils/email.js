// // // utils/email.js
// // import nodemailer from "nodemailer";

// // const transporter = nodemailer.createTransport({
// //   host: process.env.SMTP_HOST,
// //   port: Number(process.env.SMTP_PORT),
// //   secure: false, // false for port 587
// //   auth: {
// //     user: process.env.SMTP_USER,
// //     pass: process.env.SMTP_PASS,
// //   },
// // });
// // // **
// // //  * Send email via SMTP
// // //  * @param {string} to - Recipient email
// // //  * @param {string} subject - Email subject
// // //  * @param {string} htmlContent - HTML body
// // //  */
// // // /
// // // export async function sendEmail({ to, subject, htmlContent }) {
// // //   try {
// // //     const info = await transporter.sendMail({
// // //       from: process.env.EMAIL_FROM,
// // //       to,
// // //       subject,
// // //       html: htmlContent,
// // //     });

// // //     console.log("Email sent:", info.messageId);
// // //     return info;
// // //   } catch (error) {
// // //     console.error("SMTP email error:", error);
// // //     throw new Error("Failed to send email");
// // //   }
// // // }
// // export async function sendEmail({ to, subject, htmlContent }) {
// //   try {
// //     const info = await transporter.sendMail({
// //       from: process.env.EMAIL_FROM,
// //       to,
// //       subject,
// //       html: htmlContent,
// //     });

// //     console.log("Email sent:", info.messageId);
// //     return info;
// //   } catch (error) {
// //     // Log the full error so we know what went wrong
// //     console.log(process.env.SMTP_HOST)
// //     console.error("SMTP email error full details:", error);
// //     throw new Error(`Failed to send email: ${error.message}`);
// //   }
// // }

// // utils/email.js
// import SibApiV3Sdk from "sib-api-v3-sdk";

// // Initialize Brevo client
// const client = SibApiV3Sdk.ApiClient.instance;
// const apiKey = client.authentications["api-key"];
// apiKey.apiKey = process.env.BREVO_API_KEY; // your Brevo API key from .env

// const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// /**
//  * Send email via Brevo API
//  * @param {string} to - Recipient email
//  * @param {string} subject - Email subject
//  * @param {string} htmlContent - HTML body
//  */
// export async function sendEmail({ to, subject, htmlContent }) {
//   try {
//     const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail({
//       to: [{ email: to }],
//       sender: { name: "YourApp", email: process.env.BREVO_SENDER_EMAIL },
//       subject,
//       htmlContent,
//     });

//     const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
//     console.log("Email sent:", response.messageId || response);
//     return response;
//   } catch (error) {
//     console.error("Brevo API email error:", error.response?.body || error);
//     throw new Error(`Failed to send email: ${error.message}`);
//   }
// }



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

    return info;
  } catch (error) {
    console.error("Ethereal email error:", error);
    throw new Error("Failed to send email");
  }
}


