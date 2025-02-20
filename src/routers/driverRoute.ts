import express from "express";
import {
  cancelRide,
  cofirmRide,
  deteleallShiftsHistory,
  endRide,
  startRide,
  startShift,
  stopShift,
  updateDriverStatus,
} from "../controller/driverController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";
import { getAllBookingRider } from "../controller/BookingRide";

const router = express.Router();

// router.post("/driver_login", driverLogin);
router.post(
  "/start-shift/:driverId",
  authenticate,
  authorize(["driver"]),
  startShift,
);
router.post(
  "/stop-shift/:driverId",
  authenticate,
  authorize(["driver"]),
  stopShift,
);
router.patch(
  "/:driverId/status",
  authenticate,
  authorize(["driver"]),
  updateDriverStatus,
);

router.post("/confirm-ride/:driverId", authenticate, authorize(["driver"]), cofirmRide);

router.post(
  "/start-ride/:driverId",
  authenticate,
  authorize(["driver"]),
  startRide,
);

router.post(
  "/stop-ride/:driverId",
  authenticate,
  authorize(["driver"]),
  endRide,
);

router.post("/cancel-ride/:driverId", authenticate, authorize(["driver"]), cancelRide);

router.delete("/delete-shifts/:driverId", authenticate, authorize(["driver"]), deteleallShiftsHistory)
router.get("/getbooking",authenticate, authorize(["driver"]), getAllBookingRider);
export default router;
