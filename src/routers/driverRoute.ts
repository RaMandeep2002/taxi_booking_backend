import express from "express";
import {
  CalculateTotalFareApi,
  deteleallShiftsHistory,
  end_Ride,
  end_Ride_with_dropTime,
  getAllVehicles,
  // endRide,
  start_Ride,
  start_Ride_with_pickuptime,
  // startRide,
  startShift,
  startShiftwithtime,
  stopShift,
  stopShiftwithtime,
  updateDriverStatus,
} from "../controller/driverController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";
import { getAllBookingRider } from "../controller/BookingRide";
import { getsetting } from "../controller/adminController";

const router = express.Router();

// router.post("/driver_login", driverLogin);
router.get("/getDriverVechile", getAllVehicles);
// router.get("/getallVechile", authenticate, authorize(["driver"]), getAllVehicles);
router.post(
  "/start-shift",
  authenticate,
  authorize(["driver"]),
  startShift,
);
// router.post(
//   "/stop-shift",
//   authenticate,
//   authorize(["driver"]),
//   stopShift,
// );
router.post(
  "/stop-shift",
  authenticate,
  authorize(["driver"]),
  stopShiftwithtime,
);
router.post(
  "/start-shift-with-time",
  authenticate,
  authorize(["driver"]),
  startShiftwithtime,
);
router.post(
  "/start-ride",
  authenticate,
  authorize(["driver"]),
  start_Ride,
);
router.post(
  "/start-ride-with-pickuptime",
  authenticate,
  authorize(["driver"]),
  start_Ride_with_pickuptime,
);

router.post(
  "/stop-ride",
  authenticate,
  authorize(["driver"]),
  end_Ride,
);
router.post(
  "/stop-ride-with-dropTime",
  authenticate,
  authorize(["driver"]),
  end_Ride_with_dropTime,
);
// router.post(
//   "/start-ride/:driverId",
//   authenticate,
//   authorize(["driver"]),
//   startRide,
// );

// router.post(
//   "/stop-ride/:driverId",
//   authenticate,
//   authorize(["driver"]),
//   endRide,
// );


router.patch(
  "/:driverId/status",
  authenticate,
  authorize(["driver"]),
  updateDriverStatus,
);

router.post("/CalculateTotalFareApi", CalculateTotalFareApi)

router.delete("/delete-shifts/:driverId", authenticate, authorize(["driver"]), deteleallShiftsHistory)
router.get("/getbooking", authenticate, authorize(["driver"]), getAllBookingRider);
router.get("/settings", getsetting);
export default router;
