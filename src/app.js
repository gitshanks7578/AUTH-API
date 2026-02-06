import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/error.middleware.js"
import authrouter from "./routes/auth.routes.js";
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//routes
app.use("/api/v1/auth", authrouter);


app.use(errorHandler);
export default app;
