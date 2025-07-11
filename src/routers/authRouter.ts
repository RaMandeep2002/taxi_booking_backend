import express from "express";
import { register, loginuser, loginadmin, update_user, deleteUser } from "../controller/auhtController";
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
router.put("/update_user/:id", update_user)
router.delete("/delete_user/:id", deleteUser)

export default router;
