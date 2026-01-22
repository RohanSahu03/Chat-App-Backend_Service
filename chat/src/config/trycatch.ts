import type { Request, Response, NextFunction, RequestHandler } from "express";

const TryCatch = (handler: RequestHandler): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next);
        } catch (error:any) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default TryCatch;
