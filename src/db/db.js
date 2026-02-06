import mongoose from "mongoose"

export const dbconnect = async (req,res)=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log("db connected successfully")
    } catch (err) {
        console.log(`db connection failed || message : ${err.message}`)
        process.exit(1)
    }
}