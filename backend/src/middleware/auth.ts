import {
  Request,
  Response,
  NextFunction,
} from "express";

import { prisma } from "../config/db";

export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const session = req.session as any;
    const userId = session?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      req.session = null;

      return res.status(401).json({
        message: "Invalid session",
      });
    }

    (req as any).user = user;

    next();
  } catch (error) {
    next(error);
  }
}