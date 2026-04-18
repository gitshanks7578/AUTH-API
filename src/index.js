import dotenv from 'dotenv'
import {dbconnect} from "./db/db.js"
import app from "./app.js"
import dns from 'dns'
dotenv.config()
dns.setServers(["1.1.1.1","8.8.8.8"])

dbconnect().then(()=>{
    const PORT = process.env.PORT || 8000;
    app.listen(PORT,()=>{
        console.log("server started successfully")
    })
}).catch((err)=>{
    console.log("dbconnect failed, src - index.js   ",err.message)
})