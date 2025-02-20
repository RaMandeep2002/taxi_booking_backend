import express from "express";
import { bookingRide } from "../controller/BookingRide";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";
// import { startRide } from "../controller/driverController";

const router = express.Router();

router.post("/ridebooking", bookingRide);


export default router;
