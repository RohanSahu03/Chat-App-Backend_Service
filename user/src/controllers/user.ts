import { publishToQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/trycatch.js";
import { redisClient } from "../index.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import User from "../model/user.js";
import { generateToken } from "../utils/generateToken.js";

export const loginUser = TryCatch(async (req, res) => {
    const { email } = req.body;

    console.log(`[LOGIN] Request received for email: ${email}`);

    const rateLimitKey = `otp:ratelimit:${email}`;

    // 🔹 Check rate limit
    const ratelimit = await redisClient.get(rateLimitKey);

    if (ratelimit) {
        console.warn(`[RATE LIMIT] Too many OTP requests for ${email}`);

        return res
            .status(429)
            .json({ message: "Too many requests, try again later" });
    }

    // 🔹 Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(`[OTP] Generated OTP for ${email}`);

    const otpKey = `otp:${email}`;

    // 🔹 Store OTP in redis
    await redisClient.set(otpKey, otp.toString(), {
        EX: 300, // 5 min
    });

    console.log(`[REDIS] OTP stored for ${email} (expires in 5 mins)`);

    // 🔹 Set rate limit
    await redisClient.set(rateLimitKey, "true", {
        EX: 60,
    });

    console.log(`[REDIS] Rate limit set for ${email} (60s)`);

    const message = {
        to: email,
        subject: "Login OTP",
        body: `Your OTP is ${otp}`,
    };

    // 🔹 Publish to queue
    await publishToQueue("send-otp", message);

    console.log(`[RABBITMQ] OTP message queued for ${email}`);

    console.log(`[SUCCESS] OTP flow completed for ${email}`);

    res.status(200).json({ message: "OTP sent successfully" });
});



export const verifyOtp = TryCatch(async (req, res) => {

    const { email, otp } = req.body;
    
    if(!email || !otp){
        return res.status(400).json({ message: "Email and otp are required" });
    }
    const otpKey = `otp:${email}`;
    const storedOtp = await redisClient.get(otpKey);
    if (!storedOtp) {
        return res.status(400).json({ message: "Invalid OTP hh" });
    }
    if (storedOtp !== otp.toString()) {
        return res.status(400).json({ message: "Invalid OTP" });
    }
    await redisClient.del(otpKey);
    let user = await User.findOne({ email });
    if (!user) {
        const name = email.split("@")[0];
         user = await User.create({
            name,
            email,
        })
    }

    const token = generateToken(user);
    res.status(200).json({ message: "OTP verified successfully", user,token });
})


export const myProfile = TryCatch(async (req:AuthenticatedRequest, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Please Login" });
    }
    res.status(200).json({ message: "Profile fetched successfully", user });
})

export const getById = TryCatch(async (req:AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User fetched successfully", user });
})

export const getAllUsers = TryCatch(async (req:AuthenticatedRequest, res) => {
    const users = await User.find();
    res.status(200).json({ message: "Users fetched successfully", users });
})