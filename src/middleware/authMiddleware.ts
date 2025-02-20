import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, UserPayload } from "../types/custom";

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access Denied" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || "cypres";
    const decoded = jwt.verify(token, secret) as UserPayload;
    req.user = decoded;
    if (!req.user.id) {
      res.status(403).json({ message: "Invalid token structure" });
      return;
    }

    next();
  } catch (error) {
    res.status(400).json({ error: "Invaild Token" });
    return;
  }
};
