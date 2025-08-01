import express from "express";
import { bookingHistory, bookingRide, getCount, getTheUserInformation } from "../controller/BookingRide";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";
// import { startRide } from "../controller/driverController";

const router = express.Router();

router.post("/ridebooking", bookingRide);
router.get("/bookingHistory", bookingHistory);
router.get("/users", getTheUserInformation);
router.get("/getCount", getCount);

export default router;
