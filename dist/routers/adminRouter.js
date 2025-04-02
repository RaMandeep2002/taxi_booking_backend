"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const adminController_1 = require("../controller/adminController");
const BookingRide_1 = require("../controller/BookingRide");
const router = express_1.default.Router();
router.get("/adminInfo", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getAdminInfo);
router.post("/add-driver", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.adddriver);
router.post("/add-multi-driver", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.addMultipleDrivers);
router.get("/driver-details", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getDriverDetails);
router.put("/update-driver/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.upadateDriver);
router.delete("/delete-driver/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.deleteDriver);
router.post("/register-vehicle/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.registerVehicle);
router.get("/getDriverWithVehicle/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getDriverWithVehicle);
router.get("/getDriverWithVehicleandshifts/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getDriverWithVehicleandshifts);
router.put("/update-vehicle/:driverId/:registrationNumber", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.updateVehicleInfomation);
router.delete("/remove-vehicle/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.removeVehicle);
// Booking-related routes
router.delete("/delete-all-bookings", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.deleteBookingdata);
router.get("/getbooking", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), BookingRide_1.getAllBookingRider);
router.get("/getDriverListWithVehicle", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getDriverListWithVehicle);
router.get("/getDriverWithVehicleexculudeDriver", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getDriverWithVehicleexculudeDriver);
// router.get("/report-csv",authenticate, authorize(["admin"]), gettingReport);
router.get("/report-csv", adminController_1.gettingReport);
router.get("/bookings", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getBookingdeteails);
router.post("/settings", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.setting);
router.get("/settings", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["admin"]), adminController_1.getsetting);
exports.default = router;
