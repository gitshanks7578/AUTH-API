import { session } from "../models/session.model.js";
import jwt from "jsonwebtoken"
import ApiError from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";

export const verifyJWT = async (req,res,next)=>{
    try {
        const token = req?.cookies.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token) 
            throw new ApiError("token missing || not authorized",401)
        // return res.status(200).json({message : `${token}`})
        const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const existingSession = await session.findById(decoded.sessionID)
        if(!existingSession || !existingSession.valid)
            throw new ApiError("session expired || line 14",400)

        req.USER = {
            userID : decoded.userID,
            sessionID : decoded.sessionID,
            role : decoded.role,
        }

        // return apiResponse(res,{},"verifyjwt success",200)
        next()
        
    } catch (err) {
        next(err)
    }
}