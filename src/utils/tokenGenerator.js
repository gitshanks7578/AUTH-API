import jwt from "jsonwebtoken"

export const generateAccessToken = ({sessionID,userID,role}) => {
    return jwt.sign(
        {sessionID,userID,role},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:"15m"}
    )
}

export const generateRefreshToken = ({sessionID}) =>{
    return jwt.sign(
        {sessionID},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:"7d"}
    )
}