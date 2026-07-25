import request from "supertest"
import app from "../src/app.js"
import {test,expect,beforeAll,afterAll,beforeEach, describe} from "vitest"
import mongoose from "mongoose"
import {user} from "../src/models/user.model.js"
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


describe("REGISTER USER",()=>{
    //runs separately for each integration test
    beforeEach(async () => {
    await user.deleteMany({});
    });

    test("register fails when fields are missing",async()=>{
    const response = await request(app)
    .post("/api/v1/auth/register")
    .send({
        email : "test@example.com",
        password : "hello"
    })
    expect(response.status).toBe(400);
    })

    test("register endpoint works",async()=>{
        const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
            name : "test-user",
            email:"test@example.com",
            password : "hello"
        })
        //response checks
        expect(response.status).toBe(201);
        expect(response.body.data).toMatchObject({
            email : "test@example.com",
            role : "user"
        })
        expect(response.body.data.password).toBeUndefined();


        //user actually exists or not
        const existinguser = await user.findOne({
            email : "test@example.com"
        })
        expect(existinguser).not.toBeNull()

        //check if password is hashed

        const passwordMatch = await bcrypt.compare("hello",existinguser.password)
        expect(passwordMatch).toBe(true)
    
    })
    test("register fails on same email",async()=>{
        await request(app)
        .post("/api/v1/auth/register")
        .send({
            name : "test-user",
            email :"test@example.com",
            password : "hello"
        })

        const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
            name : "test-user1",
            email :"test@example.com",
            password : "hello2"
        })

        expect(response.status).toBe(409)
        expect(response.body.message).toBe("user already exists");
    })
})

describe("LOGIN USER",()=>{
    beforeEach(async()=>{


        //REMOVE DEPENDENT DATA FIRST
        await refreshToken.deleteMany({});
        await session.deleteMany({});
        await user.deleteMany({});
        await request(app)
        .post("/api/v1/auth/register")
        .send({
            name : "test-user",
            email : "test@example.com",
            password :"hello"
        })
    })

    test("login works with credentials",async()=>{
       const response = await request(app)
       .post("/api/v1/auth/login")
       .send({
        email : "test@example.com",
        password : "hello"
       })

       //check status
       expect(response.status).toBe(200)

       //check returned response
       expect(response.body.data).toMatchObject({
            accessToken : expect.any(String),
            currentRefreshToken : expect.any(String)
       })

       //check cookies

        //expect(response.headers["set-cookie"]).toBeDefined()
         expect(response.headers["set-cookie"]).toHaveLength(2)
    })

    test("password is incorrect",async()=>{
        const response = await request(app)
       .post("/api/v1/auth/login")
       .send({
        email : "test@example.com",
        password : "wrong password"
       })

       expect(response.status).toBe(400);
       expect(response.body.message).toBe("invalid password");
    })

    test("unknown email",async()=>{
        const response = await request(app)
       .post("/api/v1/auth/login")
       .send({
        email : "unknownEmail@example.com",
        password : "wrong password"
       })

       expect(response.status).toBe(404)
    })

    test("creates session and refresh token after successful login", async()=>{

    await request(app)
    .post("/api/v1/auth/login")
    .send({
        email : "test@example.com",
        password : "hello"
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

describe("REFRESH ENDPOINT",()=>{
    let refreshCookie;
    beforeEach(async()=>{
        //REMOVE DEPENDENT DATA FIRST
        await refreshToken.deleteMany({});
        await session.deleteMany({});
        await user.deleteMany({});
        //REGISTER
        await request(app)
        .post("/api/v1/auth/register")
        .send({
            name : "test-user",
            email : "test@example.com",
            password :"hello"
        })
        //LOGIN
        const login = await request(app)
        .post("/api/v1/auth/login")
        .send({
            email : "test@example.com",
            password : "hello"
        })

        let cookie = login.headers['set-cookie']
        refreshCookie = cookie[1]

    })

    test("using valid refreshtoken to generate new accesstoken",async()=>{
        const response = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", refreshCookie)

        // console.log(response.body)
        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({
            newAccessToken : expect.any(String),
            newRefreshToken : expect.any(String)
        });
    })
    test("fails when refresh token is missing", async()=>{

        const response = await request(app)
        .post("/api/v1/auth/refresh");


        expect(response.status).toBe(400);

    });
     test("fails with invalid refresh token", async()=>{

        const response = await request(app)
        .post("/api/v1/auth/refresh")
        .set(
            "Cookie",
            "refreshToken=fakeinvalidtoken"
        );

        console.log(response.body.message)
        expect(response.status).toBe(401);

    });
})

