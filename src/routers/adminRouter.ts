import express from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";
import {
  getAdminInfo,
  adddriver,
  deleteBookingdata,
  deleteDriver,
  registerVehicle,
  removeVehicle,
  upadateDriver,
  updateVehicleInfomation,
  getDriverDetails,
  getDriverWithVehicle,
  gettingReport,
  getDriverWithVehicleandshifts,
  getDriverListWithVehicle,
  getDriverWithVehicleexculudeDriver,
} from "../controller/adminController";
import { getAllBookingRider } from "../controller/BookingRide";

const router = express.Router();

router.get("/adminInfo", authenticate, authorize(["admin"]), getAdminInfo);
router.post("/add-driver", authenticate, authorize(["admin"]), adddriver);
router.get(
  "/driver-details",
  authenticate,
  authorize(["admin"]),
  getDriverDetails,
);
router.put(
  "/update-driver/:driverId",
  authenticate,
  authorize(["admin"]),
  upadateDriver,
);
router.delete(
  "/delete-driver/:driverId",
  authenticate,
  authorize(["admin"]),
  deleteDriver,
);

router.post(
  "/register-vehicle/:driverId",
  authenticate,
  authorize(["admin"]),
  registerVehicle,
);
router.get(
  "/getDriverWithVehicle/:driverId",
  authenticate,
  authorize(["admin"]),
  getDriverWithVehicle,
);

router.get(
  "/getDriverWithVehicleandshifts/:driverId",
  authenticate,
  authorize(["admin"]),
  getDriverWithVehicleandshifts,
);


router.put(
  "/update-vehicle/:driverId/:registrationNumber",
  authenticate,
  authorize(["admin"]),
  updateVehicleInfomation,
);

router.delete(
  "/remove-vehicle/:driverId",
  authenticate,
  authorize(["admin"]),
  removeVehicle,
);

// Booking-related routes
router.delete(
  "/delete-all-bookings",
  authenticate,
  authorize(["admin"]),
  deleteBookingdata,
);
router.get("/getbooking",authenticate, authorize(["admin"]), getAllBookingRider);
router.get("/getDriverListWithVehicle",authenticate, authorize(["admin"]), getDriverListWithVehicle);
router.get("/getDriverWithVehicleexculudeDriver",authenticate, authorize(["admin"]), getDriverWithVehicleexculudeDriver);
// router.get("/report-csv",authenticate, authorize(["admin"]), gettingReport);
router.get("/report-csv", gettingReport);

export default router;
