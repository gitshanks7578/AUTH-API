import dns from "dns";
import dotenv from "dotenv";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config({
  path: ".env.test",
});