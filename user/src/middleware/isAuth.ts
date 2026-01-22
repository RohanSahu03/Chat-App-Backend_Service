import type { NextFunction, Request, Response } from "express";
import type { IUser } from "../model/user.js";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

export const isAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
        res.status(401).json({ message: "Please Login - JWT error" });
    }
}
