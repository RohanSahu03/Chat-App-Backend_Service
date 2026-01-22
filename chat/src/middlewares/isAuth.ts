import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface IUser extends Document {
    _id: string;
    name: string;
    email: string;
}

export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

export const isAuth = async(req:AuthenticatedRequest, res:Response, next:NextFunction):Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized, Please Login" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = jwt.verify(token as string, process.env.JWT_SECRET as string);

        if (!decodedToken || typeof decodedToken === 'string') {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        req.user = decodedToken.user;
        next();
        
    } catch (error) {
        
    }
}