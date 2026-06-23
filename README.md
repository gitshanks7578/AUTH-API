# Auth API

A secure authentication API built with **Node.js**, **Express**, **MongoDB**, and **JWT**.  
It supports normal email-password login, Google OAuth, refresh token rotation, 2FA, password reset, email verification, session invalidation, rate limiting, and audit logs.

This project is designed like a real backend service, not just a basic login demo.

## What It Does

- Registers users with hashed passwords using `bcrypt`
- Logs users in with short-lived access tokens and long-lived refresh tokens
- Stores refresh tokens in MongoDB and rotates them on every refresh
- Detects refresh token reuse and invalidates the session
- Supports logout and invalidate-all-sessions flow
- Adds optional TOTP-based 2FA using `speakeasy`
- Sends OTP emails through Ethereal using `nodemailer`
- Supports Google OAuth login with `passport-google-oauth20`
- Tracks important auth events with immutable audit logs
- Protects sensitive routes with JWT middleware
- Adds rate limiting for OTP and verification routes

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT, cookies, sessions
- **Security:** bcrypt, refresh token rotation, 2FA, rate limiting
- **OAuth:** Google OAuth 2.0 with Passport
- **Email:** Nodemailer with Ethereal test SMTP

## Folder Structure

```txt
src/
  config/        Google OAuth passport strategy
  controller/    Authentication business logic
  db/            MongoDB connection
  middlewares/   JWT verification, errors, rate limiting
  models/        User, session, refresh token, audit log schemas
  routes/        Auth routes
  utils/         Tokens, email, API response, audit logging, 2FA
```

## Main API Routes

Base URL:

```txt
/api/v1/auth
```

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/register` | Create a new user |
| POST | `/login` | Login with email and password |
| POST | `/verify2FA` | Enable 2FA after verifying TOTP |
| POST | `/get2fasecret` | Get 2FA secret for logged-in user |
| POST | `/logout` | Logout current session |
| POST | `/refresh` | Rotate refresh token and issue new tokens |
| POST | `/invalidate-all` | Logout user from all active sessions |
| POST | `/password_reset` | Request password reset OTP |
| POST | `/reset-password` | Reset password using OTP |
| POST | `/request_verify` | Request email verification OTP |
| POST | `/verify-email` | Verify email using OTP |
| GET | `/google` | Start Google OAuth login |
| GET | `/google/callback` | Google OAuth callback |

## Security Highlights

The API uses a session-backed JWT flow. Access tokens expire quickly, while refresh tokens are persisted and rotated. If an old refresh token is reused, the API treats it as possible token theft and invalidates the session.

Passwords are never stored directly. They are hashed before saving. OTPs for password reset and email verification are also hashed before being stored.

Audit logging records successful and failed authentication events with IP address and user agent. This makes the system easier to monitor and debug.

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=your callback link
NODE_ENV=development
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Start production server:

```bash
npm start
```

## Why This Project Stands Out

This API covers authentication the way production systems think about it: sessions, token rotation, account recovery, 2FA, OAuth, rate limits, and audit logs. It shows understanding of both developer experience and security trade-offs, while keeping the code modular and easy to extend.

