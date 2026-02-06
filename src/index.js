import dotenv from 'dotenv'
import {dbconnect} from "./db/db.js"
import app from "./app.js"
dotenv.config()
dbconnect().then(()=>{
    const PORT = process.env.PORT || 8000;
    app.listen(PORT,()=>{
        console.log("server started successfully")
    })
}).catch((err)=>{
    console.log("dbconnect failed, src - index.js   ",err.message)
})