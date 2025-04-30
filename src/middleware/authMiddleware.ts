import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, UserPayload } from "../types/custom";
import User from "../models/User";

export const authenticate = async (
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
    const secret = process.env.JWT_SECRET || "srtaxi";
    const decoded = jwt.verify(token, secret) as UserPayload;

    if (decoded.role === "admin") {
      req.user = decoded;

      if (!req.user.id) {
        res.status(401).json({ message: "Invalid token structure" });
        return;
      }

      return next();
    }

    const user = await User.findById(decoded.id);
    console.log("user ---< ---<> ", user);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.status === false) {
       res.status(403).json({ message: "Your account has been disabled." });
       return;
    }

    req.user = decoded;

    if (!req.user.id) {
      res.status(401).json({ message: "Invalid token structure" });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: "Invaild Token" });
    return;
  }
};
