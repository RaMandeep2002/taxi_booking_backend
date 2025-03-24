"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTheUserInformation = exports.bookingHistory = exports.getAllBookingRider = exports.bookingRide = void 0;
const crypto_1 = __importDefault(require("crypto"));
// import bcrypt from "bcryptjs";
const BookingModels_1 = __importDefault(require("../models/BookingModels"));
const User_1 = __importDefault(require("../models/User"));
const bookingSchema_1 = require("../schema/bookingSchema");
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
        const validationResult = bookingSchema_1.bookingSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({ errors: validationResult.error.errors });
            return;
        }
        const { customerName, phoneNumber, pickup, dropOff, pickuptime, } = validationResult.data;
        if (!customerName ||
            !phoneNumber ||
            !pickup ||
            !dropOff ||
            !pickuptime) {
            res.status(400).json({ message: "Missing required fields." });
            return;
        }
        const pickupDate = new Date(pickuptime);
        const pickupDateIST = new Date(pickupDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const currentDateIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        if (pickupDateIST < currentDateIST) {
            res.status(400).json({ message: "Pickup time cannot be in the past" });
            return;
        }
        const pickupDateISO = pickupDate.toISOString().split("T")[0];
        const existingBooking = await BookingModels_1.default.findOne({
            phoneNumber,
            pickupDate: pickupDateISO,
            status: { $ne: "cancelled" } // Exclude cancelled bookings
        });
        if (existingBooking) {
            res.status(400).json({ message: "You already have an active booking for this date" });
            return;
        }
        const bookingId = generateBookingId();
        const newBooking = new BookingModels_1.default({
            bookingId,
            customerName,
            phoneNumber,
            pickup,
            dropOff,
            pickuptime: new Intl.DateTimeFormat("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata"
            }).format(pickupDate),
            pickupDate: pickupDateISO,
            pickupTimeFormatted: new Intl.DateTimeFormat("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata"
            }).format(pickupDate),
            pickupMonth: pickupDate.toLocaleString("default", { month: "long" }),
            pickupWeek: getWeekNumber(pickupDate)
        });
        console.log("newBooking ===> ", newBooking);
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
const bookingHistory = async (req, res) => {
    try {
        const bookings = await BookingModels_1.default.aggregate([
            {
                $lookup: {
                    from: "drivers", // Reference to the Driver collection
                    localField: "driver",
                    foreignField: "_id",
                    as: "driver",
                },
            },
            {
                $unwind: {
                    path: "$driver",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "vehicles",
                    localField: "driver.vehicle",
                    foreignField: "_id",
                    as: "driver.vehicles"
                }
            },
            {
                $unwind: {
                    path: "$driver.vehicles",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    bookingId: 1,
                    customerName: 1,
                    pickuptime: 1,
                    totalFare: 1,
                    paymentStatus: 1,
                    status: 1,
                    // Driver details
                    "driver.drivername": 1,
                    "driver.email": 1,
                },
            },
        ]);
        if (!bookings.length) {
            res.status(404).json({ message: "No booking found" });
            return;
        }
        res.status(200).json({ message: "Successfully fetch the History", bookings });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.bookingHistory = bookingHistory;
const getTheUserInformation = async (req, res) => {
    try {
        const users = await User_1.default.find({ role: "customer" });
        console.log("users ===> ", users);
        if (!users) {
            res.status(404).json({ message: "users not found!!" });
        }
        res.status(200).json({ message: "users fetch successfully!!", users });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch the users!!", error });
    }
};
exports.getTheUserInformation = getTheUserInformation;
