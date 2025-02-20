import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface UserPayload extends JwtPayload {
  _id: string;
  role: string;
}
