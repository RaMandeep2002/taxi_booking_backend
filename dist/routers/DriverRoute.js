"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const driverController_1 = require("../controller/driverController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const BookingRide_1 = require("../controller/BookingRide");
const router = express_1.default.Router();
// router.post("/driver_login", driverLogin);
router.get("/getDriverVechile", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.getTheDriverVechicle);
router.post("/start-shift/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.startShift);
router.post("/stop-shift/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.stopShift);
router.post("/start-ride/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.start_Ride);
router.post("/stop-ride/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.end_Ride);
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
router.patch("/:driverId/status", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.updateDriverStatus);
router.post("/confirm-ride/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.cofirmRide);
router.post("/cancel-ride/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.cancelRide);
router.delete("/delete-shifts/:driverId", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), driverController_1.deteleallShiftsHistory);
router.get("/getbooking", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(["driver"]), BookingRide_1.getAllBookingRider);
exports.default = router;
