import request from "supertest"
import app from "../src/app.js"
import { test, expect, beforeAll, afterAll, beforeEach, describe } from "vitest"
import mongoose from "mongoose"
import { user } from "../src/models/user.model.js"
import { session } from "../src/models/session.model.js"
import { refreshToken } from "../src/models/refreshToken.model.js"


import bcrypt from "bcrypt"
import { refresh } from "../src/controller/auth.controller.js"




beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("auth Test DB:", mongoose.connection.name);
});





afterAll(async () => {
    await mongoose.disconnect();
});


// //dummy connection
// test("dummy tests",()=>{
//     expect(1+1).toBe(2);
// })


describe("REGISTER USER", () => {
    //runs separately for each integration test
    beforeEach(async () => {
        await user.deleteMany({});
    });

    test("register fails when fields are missing", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "test@example.com",
                password: "hello"
            })
        expect(response.status).toBe(400);
    })

    test("register endpoint works", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })
        //response checks
        expect(response.status).toBe(201);
        expect(response.body.data).toMatchObject({
            email: "test@example.com",
            role: "user"
        })
        expect(response.body.data.password).toBeUndefined();


        //user actually exists or not
        const existinguser = await user.findOne({
            email: "test@example.com"
        })
        expect(existinguser).not.toBeNull()

        //check if password is hashed

        const passwordMatch = await bcrypt.compare("hello", existinguser.password)
        expect(passwordMatch).toBe(true)

    })
    test("register fails on same email", async () => {
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })

        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user1",
                email: "test@example.com",
                password: "hello2"
            })

        expect(response.status).toBe(409)
        expect(response.body.message).toBe("user already exists");
    })
})

describe("LOGIN USER", () => {
    beforeEach(async () => {


        //REMOVE DEPENDENT DATA FIRST
        await refreshToken.deleteMany({});
        await session.deleteMany({});
        await user.deleteMany({});
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })
    })

    test("login works with credentials", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "test@example.com",
                password: "hello"
            })

        //check status
        expect(response.status).toBe(200)

        //check returned response
        expect(response.body.data).toMatchObject({
            accessToken: expect.any(String),
            currentRefreshToken: expect.any(String)
        })

        //check cookies

        //expect(response.headers["set-cookie"]).toBeDefined()
        expect(response.headers["set-cookie"]).toHaveLength(2)
    })

    test("password is incorrect", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "test@example.com",
                password: "wrong password"
            })

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("invalid password");
    })

    test("unknown email", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "unknownEmail@example.com",
                password: "wrong password"
            })

        expect(response.status).toBe(404)
    })

    test("creates session and refresh token after successful login", async () => {

        await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "test@example.com",
                password: "hello"
            })


        const existingSession = await session.findOne();

        expect(existingSession).not.toBeNull();
        expect(existingSession.valid).toBe(true);



        const existingRefreshToken = await refreshToken.findOne();

        expect(existingRefreshToken).not.toBeNull();
        expect(existingRefreshToken.valid).toBe(true);

        expect(existingRefreshToken.session.toString()).toBe(existingSession._id.toString())

    })
})

describe("REFRESH ENDPOINT", () => {
    let refreshCookie;
    beforeEach(async () => {
        //REMOVE DEPENDENT DATA FIRST
        await refreshToken.deleteMany({});
        await session.deleteMany({});
        await user.deleteMany({});
        //REGISTER
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })
        //LOGIN
        const login = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "test@example.com",
                password: "hello"
            })

        let cookie = login.headers['set-cookie']
        refreshCookie = cookie[1]

    })

    test("using valid refreshtoken to generate new accesstoken", async () => {
        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie)

        // console.log(response.body)
        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({
            newAccessToken: expect.any(String),
            newRefreshToken: expect.any(String)
        });
    })
    test("fails when refresh token is missing", async () => {

        const response = await request(app)
            .post("/api/v1/auth/refresh");


        expect(response.status).toBe(400);

    });
    test("fails with invalid refresh token", async () => {

        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set(
                "Cookie",
                "refreshToken=fakeinvalidtoken"
            );


        expect(response.status).toBe(401);

    });

    //session tests
    test("fails when session does not exist", async () => {
        await session.deleteMany({})

        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie)

        expect(response.status).toBe(400)
        expect(response.body.message).toBe("SESSION EXPIRED")
    })
    test("session exists but is invalid", async () => {
        const existing_session = await session.findOne()
        existing_session.valid = false;
        await existing_session.save();

        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie)

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("SESSION EXPIRED")
    })

    test("detects refresh token reuse", async () => {
        const token = await refreshToken.findOne()
        token.valid = false;
        await token.save();

        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie)

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Refresh token reuse detected. Session terminated.")

    })
    test("user linked with session does not exist", async () => {
        await user.deleteMany({})
        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie)

        expect(response.status).toBe(401)
        expect(response.body.message).toBe("user linked to session no longer exists")

    })

    test("old refresh token becomes invalid", async () => {
        const oldToken = await refreshToken.findOne()

        await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie)

        const updatedToken = await refreshToken.findById(oldToken._id)

        expect(updatedToken.valid).toBe(false)






    })

    test("creates a new refresh token", async () => {

        await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie);

        const tokens = await refreshToken.find();

        expect(tokens).toHaveLength(2);
        const validTokens =
            await refreshToken.find({ valid: true });

        expect(validTokens).toHaveLength(1);

    });
    test("returns new cookies", async () => {

        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie);

        expect(response.headers["set-cookie"])
            .toHaveLength(2);

    });
})

describe("LOGOUT", () => {
    let accessCookie;
    let refreshCookie;
    let accessToken;
    beforeEach(async () => {
        await refreshToken.deleteMany({})
        await session.deleteMany({})
        await user.deleteMany({})

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })
        //LOGIN
        const login = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "test@example.com",
                password: "hello"
            })

        accessCookie = login.headers["set-cookie"][0]
        refreshCookie = login.headers["set-cookie"][1]
        accessToken = login.body.data.accessToken;

    })


    test("successful logout", async () => {
        const response = await request(app)
            .post("/api/v1/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Logged out");
    })
    test("invalidating sessions", async () => {
        const existing_session = await session.findOne()
        const response = await request(app)
            .post("/api/v1/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`)

        const updatedSession = await session.findById(existing_session._id)

        expect(updatedSession.valid).toBe(false);
    })
    test("invalidates all refresh tokens linked to session", async () => {

        const existingSession = await session.findOne();

        await request(app)
            .post("/api/v1/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`);

        const tokens = await refreshToken.find({
            session: existingSession._id
        });

        expect(tokens).toHaveLength(1);

        expect(tokens[0].valid).toBe(false);

    });

    test("clears authentication cookies", async () => {

        const response = await request(app)
            .post("/api/v1/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`);

        const cookies = response.headers["set-cookie"];

        expect(cookies).toHaveLength(2);

        expect(cookies[0]).toContain("accessToken=");

        expect(cookies[1]).toContain("refreshToken=");

    });


})



describe("GET 2FA SECRET", () => {
    let accessToken;
    beforeEach(async () => {
        await refreshToken.deleteMany({})
        await session.deleteMany({})
        await user.deleteMany({})

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })
        //LOGIN
        const login = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "test@example.com",
                password: "hello"
            })
        accessToken = login.body.data.accessToken;
    })

    test("authenticated user successfully returns 2fa secret", async () => {
        const response = await request(app)
            .post("/api/v1/auth/get2fasecret")
            .set("Authorization", `Bearer ${accessToken}`)

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("secret provided successfully")
    })
    test("fails without access token", async () => {

        const response = await request(app)
            .post("/api/v1/auth/get2fasecret");

        expect(response.status).toBe(401);

    });

    test("user doesn't exist for the token used", async () => {
        await user.deleteMany({})

        const response = await request(app)
            .post("/api/v1/auth/get2fasecret")
            .set("Authorization", `Bearer ${accessToken}`)

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("user not found")
    })

    test("existing user's 2fa already enabled", async () => {
        const existUser = await user.findOne()
        existUser.twoFAEnabled = true;
        await existUser.save();

        const response = await request(app)
            .post("/api/v1/auth/get2fasecret")
            .set("Authorization", `Bearer ${accessToken}`)

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("cannot get secret 2fa already enabled")
    })


})


describe("REQUEST EMAIL VERIFICATION", () => {
    let accessToken;
    beforeEach(async () => {
        await refreshToken.deleteMany({})
        await session.deleteMany({})
        await user.deleteMany({})

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })
        //LOGIN
        const login = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "test@example.com",
                password: "hello"
            })
        accessToken = login.body.data.accessToken;
    })

    test("authenticated user successfully gets otp sent on their mail", async () => {
        const response = await request(app)
            .post("/api/v1/auth/request_verify")
            .send({
                email: "test@example.com"
            })
            .set("Authorization", `Bearer ${accessToken}`)

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("verification otp generated")
    })
    test("unauthenticated user fails to get otp", async () => {
        const response = await request(app)
            .post("/api/v1/auth/request_verify")
            .send({
                email: "test@example.com"
            })


        expect(response.status).toBe(401);
        expect(response.body.message).toBe("token missing || not authorized")
    })
    test("email not sent in the body", async () => {
        const response = await request(app)
            .post("/api/v1/auth/request_verify")
            .send({ email: "" })
            .set("Authorization", `Bearer ${accessToken}`)

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("email required")
    })
    test("wrong email sent | user not found", async () => {
        const response = await request(app)
            .post("/api/v1/auth/request_verify")
            .send({
                email: "wrong@email.com"
            })
            .set("Authorization", `Bearer ${accessToken}`)

        expect(response.status).toBe(404)
        expect(response.body.message).toBe("user not found")

    })
    test("user's email already verified", async () => {
        const existingUser = await user.findOne()
        existingUser.isEmailVerified = true;
        await existingUser.save()

        const response = await request(app)
            .post("/api/v1/auth/request_verify")
            .send({
                email: "test@example.com"
            })
            .set("Authorization", `Bearer ${accessToken}`)

        expect(response.status).toBe(400)
        expect(response.body.message).toBe("email already verified")
    })

    test("stores verification otp and expiry", async () => {
        await request(app)
            .post("/api/v1/auth/request_verify")
            .send({
                email: "test@example.com"
            })
            .set("Authorization", `Bearer ${accessToken}`);

        const existingUser = await user.findOne({
            email: "test@example.com"
        });

        expect(existingUser.emailVerificationOTP).toBeDefined();
        expect(existingUser.emailVerificationOTPExpires).toBeDefined();
    });
})


describe("PASSWORD RESET REQUEST", () => {
    beforeEach(async () => {
        await refreshToken.deleteMany({})
        await session.deleteMany({})
        await user.deleteMany({})

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "test-user",
                email: "test@example.com",
                password: "hello"
            })

    })



    test("successful request for password reset", async () => {
        const response = await request(app)
            .post("/api/v1/auth/password_reset")
            .send({
                email: "test@example.com"
            })

        expect(response.status).toBe(200)
        expect(response.body.message).toBe("verification otp generated")

    })
    test("email not sent in the body", async () => {
        const response = await request(app)
            .post("/api/v1/auth/password_reset")
            .send({ email: "" })


        expect(response.status).toBe(400);
        expect(response.body.message).toBe("EMAIL REQUIRED")
    })
    test("user doesn't exists for the provided email", async () => {
        await user.deleteMany({})

        const response = await request(app)
            .post("/api/v1/auth/password_reset")
            .send({
                email: "test@example.com"
            })


        expect(response.status).toBe(400)
        expect(response.body.message).toBe("user doesnt exist");
    })

    test("if google auth provider is used",async()=>{
        const existingUser = await user.findOne()
        existingUser.authProvider = "google"
        await existingUser.save();

        const response = await request(app)
            .post("/api/v1/auth/password_reset")
            .send({
                email: "test@example.com"
            })

        expect(response.status).toBe(400) 
        expect(response.body.message).toBe("google auth provider | cant change password")

    })

    test("hashed otp and expiry is defined after generation",async()=>{
        
        await request(app)
            .post("/api/v1/auth/password_reset")
            .send({
                email: "test@example.com"
            })

        const existing_user = await user.findOne()

        expect(existing_user.passwordResetOTP).toBeDefined()
        expect(existing_user.passwordResetOTPExpires).toBeDefined()
        
    })

})

