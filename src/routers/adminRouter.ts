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
  getBookingdeteails,
  addMultipleDrivers,
  setting,
  getsetting,
  registerVehiclewithparams,
  registerSharedVehicle,
  getAllShifts,
  getAllShifts12,
  updateSettings,
  disableDriver,
  activateDriver,
  getDriverWithAssignedVehicle,
  stopshiftbyadmin,
  scheduleRide,
} from "../controller/adminController";
import { getAllBookingRider } from "../controller/BookingRide";

const router = express.Router();

router.get("/adminInfo", authenticate, authorize(["admin"]), getAdminInfo);
router.post("/add-driver", authenticate, authorize(["admin"]), adddriver);
router.post("/add-multi-driver", authenticate, authorize(["admin"]),addMultipleDrivers );
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
router.put(
  "/disable-Driver/:driverId",
  authenticate,
  authorize(["admin"]),
  disableDriver,
);
router.put(
  "/activate-Driver/:driverId",
  authenticate,
  authorize(["admin"]),
  activateDriver,
);
router.put(
  "/stopshiftbyadmin/:driverId",
  authenticate,
  authorize(["admin"]),
  stopshiftbyadmin,
);

router.post(
  "/register-vehicle-with_params/:driverId",
  authenticate,
  authorize(["admin"]),
  registerVehiclewithparams,
);
router.post(
  "/register-vehicle",
  authenticate,
  authorize(["admin"]),
  registerVehicle,
);
router.post(
  "/register-vehicle-shared",
  authenticate,
  authorize(["admin"]),
  registerSharedVehicle,
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
  "/update-vehicle/:registrationNumber",
  authenticate,
  authorize(["admin"]),
  updateVehicleInfomation,
);

router.delete(
  "/remove-vehicle/:registrationNumber",
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
router.get("/bookings", authenticate, authorize(["admin"]),getBookingdeteails);


router.post("/settings", authenticate, authorize(["admin"]), setting);
router.put("/settings", authenticate, authorize(["admin"]), updateSettings);
router.get("/settings", getsetting);

router.post("/scheduleRide", authenticate, authorize(["admin"]), scheduleRide);

router.get("/shiftsHistory",getAllShifts12)
router.get("/getallshiftwithdriverandvehicle", getDriverWithAssignedVehicle)

export default router;
