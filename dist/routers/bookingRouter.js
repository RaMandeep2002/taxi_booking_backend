"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BookingRide_1 = require("../controller/BookingRide");
// import { startRide } from "../controller/driverController";
const router = express_1.default.Router();
router.post("/ridebooking", BookingRide_1.bookingRide);
router.get("/bookingHistory", BookingRide_1.bookingHistory);
router.get("/users", BookingRide_1.getTheUserInformation);
exports.default = router;
