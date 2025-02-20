import { AuthRequest } from "../middleware/authMiddleware";

declare global {
  namespace Express {
    interface Request extends AuthRequest {}
  }
}
