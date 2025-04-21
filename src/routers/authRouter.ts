import express from "express";
import { register, loginuser, loginadmin } from "../controller/auhtController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";
import { Roles } from "../types/roles";

const router = express.Router();

router.post(
  "/register",
  register,
);

// Login endpoint
router.post("/login", loginuser);
router.post("/login-admin", loginadmin);

export default router;
