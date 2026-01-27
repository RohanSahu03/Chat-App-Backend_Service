import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import {createClient} from "redis";
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import cors from "cors";

dotenv.config();
// databse connection
connectDB();

// rabbitmq connection
connectRabbitMQ();

// redis connection
export const redisClient = createClient({
    url: process.env.REDIS_URL || ""
});

redisClient.connect().then(()=>{
    console.log("Redis connected");
}).catch((err)=>{
    console.log(err);
});

const app = express();

app.use( cors({
    origin: [ "http://localhost:3000"],
    credentials: true,
     methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// middleware
app.use(express.json());

// routes
app.use("/api/v1", userRoutes);

// port
const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});