import { createClient } from "redis"
import dotenv from "dotenv"

dotenv.config()


export const client = createClient({
  url: process.env.REDIS_URL
});



client.on("error", function(err) {
  console.log("redis error : ",err)
});

client.on("connect", () => {
  console.log("Connected to Redis");
});


await client.connect()

