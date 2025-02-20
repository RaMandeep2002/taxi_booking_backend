"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllBookingRider = exports.bookingRide = void 0;
const crypto_1 = __importDefault(require("crypto"));
// import bcrypt from "bcryptjs";
const BookingModels_1 = __importDefault(require("../models/BookingModels"));
const generateBookingId = () => {
    const bookingId = crypto_1.default.randomBytes(4).toString("hex");
    return bookingId;
};
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return weekNumber;
}
;
const bookingRide = async (req, res) => {
    try {
        const { customerName, phoneNumber, pickup, dropOff, pickuptime, } = req.body;
        if (!customerName ||
            !phoneNumber ||
            !pickup ||
            !dropOff ||
            !pickuptime) {
            res.status(400).json({ message: "Missing required fields." });
            return;
        }
        // Check if user already has a booking for this pickup time
        const existingBooking = await BookingModels_1.default.findOne({
            phoneNumber,
            pickupDate: new Date(pickuptime).toISOString().split("T")[0],
            status: { $ne: "cancelled" } // Exclude cancelled bookings
        });
        if (existingBooking) {
            res.status(400).json({ message: "You already have an active booking for this date" });
            return;
        }
        const pickupDate = new Date(pickuptime);
        const bookingId = generateBookingId();
        const newBooking = new BookingModels_1.default({
            bookingId,
            customerName,
            phoneNumber,
            pickup,
            dropOff,
            pickuptime: pickupDate.toISOString(),
            pickupDate: pickupDate.toISOString().split("T")[0],
            pickupTimeFormatted: pickupDate.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata"
            }),
            pickupMonth: pickupDate.toLocaleString("default", { month: "long" }),
            pickupWeek: getWeekNumber(pickupDate)
        });
        await newBooking.save();
        res
            .status(201)
            .json({ message: "Booking created successfully", booking: newBooking });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
        console.log("Something went wrong! ==> ", error.message);
    }
};
exports.bookingRide = bookingRide;
const getAllBookingRider = async (req, res) => {
    console.log("entered");
    try {
        // const { bookingId } = req.params;
        const booking = await BookingModels_1.default.find();
        if (!booking.length) {
            res.status(404).json({ message: "Booking not found." });
            return;
        }
        res.status(200).json({ message: "Booking found.", booking });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
        console.log("Something went wrong! ==> ", error.message);
    }
};
exports.getAllBookingRider = getAllBookingRider;
