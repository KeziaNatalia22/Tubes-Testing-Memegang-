import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { middlewareWrapper } from "../utils/middlewareWrapper";

const adminMiddleware = middlewareWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      res.locals.errorCode = 401;
      throw new Error("Unauthorized: User not authenticated");
    }

    const user = await User.findByPk(userId);
    
    if (!user) {
      res.locals.errorCode = 404;
      throw new Error("User not found");
    }

    if (user.role !== 'admin') {
      res.locals.errorCode = 403;
      throw new Error("Forbidden: Admin access required");
    }

    next();
  }
);

export default adminMiddleware;
