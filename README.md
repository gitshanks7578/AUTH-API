# Auth API

An authentication API built with **Node.js**, **Express**, **MongoDB**, and **JWT**.

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-black?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Passport](https://img.shields.io/badge/OAuth_Passport-2C3E50?style=for-the-badge)
![2FA](https://img.shields.io/badge/2FA-TOTP-orange?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Implemented-red?style=for-the-badge)

It implements **session-backed JWTs, refresh-token rotation, Google OAuth, TOTP 2FA, email verification, password recovery, and audit logging**.

api link : https://auth-api-yncw.onrender.com

oAuth test link : https://authapi-oauth-test.onrender.com

---

## Key Features

### Authentication

* Email/password registration and login
* Secure password hashing using `bcrypt`
* JWT-based authentication with access and refresh tokens
* Tokens set in HTTP-only cookies and returned in successful authentication responses

### Session & Token Security

* Session tracking for every login
* Refresh token rotation
* Refresh token reuse detection that invalidates the affected session
* Global logout via session invalidation
* Multi-session support per user

### OAuth

* Google OAuth 2.0 login using `passport-google-oauth20`
* Automatic user creation for new Google accounts
* Seamless integration with existing JWT/session system

### Two-Factor Authentication (2FA)

* TOTP-based authentication using `speakeasy`
* Per-user activation after TOTP verification
* Secure secret generation and verification

### Account Recovery

* Password reset via OTP (hashed storage)
* Email verification via OTP 
* Hashed OTPs with a 10-minute expiry

### Security & Monitoring

* Redis-backed, endpoint-scoped rate limiting for sensitive endpoints
* Audit logging for registration, login, token refresh, recovery, and rate-limit events
* IP address and user-agent tracking
* Protection against invalid session reuse

---

## Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB + Mongoose
* **Rate limiting:** Redis + rate-limiter-flexible
* **Authentication:** JWT, Sessions, Cookies
* **OAuth:** Google OAuth 2.0 (Passport.js)
* **Security:** bcrypt, refresh token rotation, TOTP (2FA), rate limiting
* **Email Service:** Resend

---

## Project Structure

```txt
src/
  config/        Passport Google OAuth strategy
  controller/    Authentication business logic
  db/            MongoDB connection setup
  middlewares/   JWT auth, error handling, rate limiting
  models/        User, Session, RefreshToken, AuditLog schemas
  routes/        Auth route definitions
  utils/         Token generation, email service, 2FA, audit logger
```

---

## API Endpoints

Base URL:

```
/api/v1/auth
```

| Method | Endpoint           | Description                               |
| ------ | ------------------ | ----------------------------------------- |
| POST   | `/register`        | Create a new user account                 |
| POST   | `/login`           | Login with email and password             |
| POST   | `/verify2FA`       | Enable and verify TOTP-based 2FA          |
| POST   | `/get2fasecret`    | Retrieve 2FA secret for setup             |
| POST   | `/logout`          | Logout current session                    |
| POST   | `/refresh`         | Rotate refresh token and issue new tokens |
| POST   | `/invalidate-all`  | Logout from all active sessions           |
| POST   | `/password_reset`  | Request password reset OTP                |
| POST   | `/reset-password`  | Reset password using OTP                  |
| POST   | `/request_verify`  | Request email verification OTP            |
| POST   | `/verify-email`    | Verify email using OTP                    |
| GET    | `/google`          | Initiate Google OAuth login               |
| GET    | `/google/callback` | Google OAuth callback handler             |
| POST   | `/google/verify-2fa` | Complete Google login with a 2FA challenge |

---

## Security Architecture

This system follows a **session-backed JWT model**:

* Access tokens expire after two hours
* Refresh tokens are stored in MongoDB and rotated on every use
* Each login creates a unique session record
* Refresh-token reuse invalidates the session linked to that token

### Protection Mechanisms

* Passwords are hashed before storage
* OTPs are hashed before saving in DB
* Refresh token reuse triggers session termination
* Audit logs track key authentication and security events
* Sensitive routes are rate-limited independently per IP or authenticated user

---

## Environment Variables

Create a `.env` file:

```env
PORT=8000
MONGODB_URI=your_mongodb_uri
REDIS_URL=rediss://default:your_password@your-redis-host:6379

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=your_callback_url
RESEND_API_KEY=your_api_key
NODE_ENV=development
```

---

## Running Locally

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

---

## Design Philosophy

This project is built around real-world backend authentication principles:

* Stateless authentication with controlled session tracking
* Defense against token theft via reuse detection
* Clear separation between identity (OAuth/local) and authorization (JWT/session)
* Secure OTP, token, and recovery flows
* Modular architecture designed for scalability

---
