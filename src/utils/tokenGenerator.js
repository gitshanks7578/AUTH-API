import jwt from "jsonwebtoken"
import crypto from "crypto"
export const generateAccessToken = ({sessionID,userID,role}) => {
    return jwt.sign(
        {sessionID,userID,role},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:"2h"}
    )
}

export const generateRefreshToken = ({sessionID}) =>{
    return jwt.sign(
        {sessionID,jti:crypto.randomUUID()},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:"7d"}
    )
}