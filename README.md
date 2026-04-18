# AUTH API

## Project Title  
**AUTH API – Secure Authentication Backend (Node.js + Express + MongoDB)**

## Project Overview  
A production-style authentication backend implementing secure user authentication, session management, and token-based authorization. It supports JWT access/refresh tokens, refresh token rotation, optional TOTP-based 2FA, email verification, password reset via OTP, session invalidation, and audit logging for authentication events.

Designed as an API-first backend with security-focused authentication flows.

---

## Live Demo  
- **Deployed Backend:** https://auth-api-yncw.onrender.com  
- **Postman Collection:**  
https://www.postman.com/shashanku346-9208905/workspace/auth-api-testing/collection/49663479-3badb633-3a6e-4f1b-9838-f04a70a888e7?action=share&source=copy-link&creator=49663479

---

## Tech Stack  
- Node.js  
- Express.js  
- MongoDB + Mongoose  
- JWT (Access + Refresh Tokens)  
- HttpOnly Cookies  
- bcrypt (password hashing)  
- speakeasy (TOTP 2FA)  
- Nodemailer (Ethereal for testing)

---

## Core Features  

### Authentication System  
- User registration with role support (user/admin)  
- Secure login with password verification  
- JWT-based authentication (access + refresh tokens)  
- HttpOnly cookie-based session handling  

### 2FA (TOTP)  
- Optional two-factor authentication using speakeasy  
- Time-based OTP verification via authenticator apps  
- Secure login enhancement for sensitive accounts  

### Session Management  
- Session creation on login  
- Refresh token rotation on every refresh request  
- Refresh token reuse detection with session invalidation  
- Logout invalidates current session  
- Global logout (invalidate all sessions)

### Email & OTP Flows  
- Email verification via OTP  
- Password reset via OTP  
- OTP expiry handling (time-limited tokens)

### Security Controls  
- Rate limiting on sensitive endpoints  
- Audit logging for authentication events  
- Session validation middleware  
- Token integrity checks on refresh flow  

---

## Authentication Flow  
1. Register user  
2. Enable 2FA using authenticator app like google authenticator  
3. Login with email + password + TOTP  (here TOTP are compulsory for login)  
4. Server issues:  
   - Access Token (15 min)  
   - Refresh Token (7 days)  
5. Protected routes validate session + access token  
6. Refresh endpoint rotates tokens securely
7. User can reset passwords and verify email
8. Ethereal is used to simulate emails
8. Logout invalidates session  
9. GLOBAL LOGOUT :  invalidate all sessions globally  

---

## API Testing  
Use the Postman collection for full API flow testing.

---

## Environment Variables  
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
NODE_ENV=development
