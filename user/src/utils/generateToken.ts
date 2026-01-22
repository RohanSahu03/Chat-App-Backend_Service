import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
}

export const generateToken = (user: any) => {
    return jwt.sign({ user }, secret, { expiresIn: "1d" });
}