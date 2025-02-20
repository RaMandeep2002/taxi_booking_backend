"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deteleallShiftsHistory = exports.cancelRide = exports.endRide = exports.startRide = exports.cofirmRide = exports.stopShift = exports.startShift = exports.updateDriverStatus = void 0;
const DriverModels_1 = require("../models/DriverModels");
const BookingModels_1 = __importDefault(require("../models/BookingModels"));
const updateDriverStatus = async (req, res) => {
    const { driverId } = req.params;
    const { status } = req.body;
    if (!["available", "busy", "not working"].includes(status)) {
        res.status(400).json({ message: "Invaild status value" });
        return;
    }
    try {
        const driver = await DriverModels_1.Driver.findOneAndUpdate({ driverId }, { status }, { new: true });
        if (!driver) {
            res.status(404).json({ message: "Driver Not found!" });
            return;
        }
        res
            .status(200)
            .json({ message: "Driver status Update successfully", driver });
    }
    catch (error) {
        res.status(500).json({ message: "Error Updating Driver status", error });
    }
};
exports.updateDriverStatus = updateDriverStatus;
const startShift = async (req, res) => {
    const { driverId } = req.params;
    const { vehicleUsed } = req.body;
    try {
        const driver = await DriverModels_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found" });
            return;
        }
        console.log(driver.vehicle.includes(vehicleUsed));
        if (!driver.vehicle.includes(vehicleUsed)) {
            res.status(400).json({ message: "Invalid vehicle" });
            return;
        }
        const activeShift = await DriverModels_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
        console.log("activeShift ==> ", activeShift);
        if (activeShift) {
            res.status(400).json({ message: "A shift is already active" });
            return;
        }
        const newShift = {
            driverId,
            startTime: new Date(),
            endTime: null,
            vehicleUsed,
            totalEarnings: 0,
            totalTrips: 0,
            totalDistance: 0,
            isActive: true,
        };
        const shift = new DriverModels_1.Shift(newShift);
        await shift.save();
        driver.shifts.push(shift._id); // Type assertion to fix type error
        await driver.save();
        res.status(200).json({ message: "Shift started", shift: shift }); // Return saved shift object
    }
    catch (error) {
        res.status(500).json({ message: "Error starting shift", error });
    }
};
exports.startShift = startShift;
const stopShift = async (req, res) => {
    const { driverId } = req.params;
    try {
        const driver = await DriverModels_1.Driver.findOne({ driverId }).populate("shifts");
        console.log("driver ==> ", driver);
        if (!driver) {
            res.status(404).json({ message: "Not active shift found!" });
            return;
        }
        const activeShift = await DriverModels_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
        if (!activeShift) {
            res.status(400).json({ message: "No active shift found!!" });
            return;
        }
        activeShift.endTime = new Date();
        activeShift.isActive = false;
        await activeShift.save();
        await driver.save();
        res.status(200).json({ message: "Shift ended", shift: activeShift });
    }
    catch (error) {
        res.status(500).json({ message: "Error stopping shift", error });
    }
};
exports.stopShift = stopShift;
const cofirmRide = async (req, res) => {
    const { driverId } = req.params;
    const { bookingId } = req.body;
    try {
        const driver = await DriverModels_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found!!" });
            return;
        }
        const booking = await BookingModels_1.default.findOne({ bookingId });
        if (!booking) {
            res.status(404).json({ message: "Booking not found!!" });
            return;
        }
        if (booking.status !== "pending") {
            res.status(400).json({ message: "Booking is pending" });
            return;
        }
        if (driver.status !== "available") {
            res.status(400).json({ message: "Driver is not available" });
            return;
        }
        booking.status = "accepted";
        await booking.save();
        res.status(200).json({ message: "Ride confirmed successfully", booking });
    }
    catch (error) {
        res.status(500).json({ message: "Error confirming Rider", error });
    }
};
exports.cofirmRide = cofirmRide;
const startRide = async (req, res) => {
    const { driverId } = req.params;
    const { bookingId } = req.body;
    if (!driverId || !bookingId) {
        res.status(400).json({ message: "driverId and bookingId are requried" });
        return;
    }
    try {
        const driver = await DriverModels_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found!!" });
            return;
        }
        const activeShift = await DriverModels_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
        if (!activeShift) {
            res.status(400).json({ message: "no active shift found" });
            return;
        }
        const booking = await BookingModels_1.default.findOne({ bookingId });
        if (!booking) {
            res.status(404).json({ message: "Booking not found!!" });
            return;
        }
        if (booking.status !== "accepted") {
            res.status(400).json({ message: "Booking is not accepted" });
            return;
        }
        if (driver.status !== "available") {
            res.status(400).json({ message: "Driver is not available" });
            return;
        }
        activeShift.totalTrips += 1;
        booking.status = "ongoing";
        driver.status = "busy";
        await activeShift.save();
        await booking.save();
        await driver.save();
        res.status(200).json({ message: "Ride started successfully", booking });
    }
    catch (error) {
        res.status(500).json({ message: "Error starting the ride", error });
    }
};
exports.startRide = startRide;
const endRide = async (req, res) => {
    const { driverId } = req.params;
    const { bookingId, distance } = req.body;
    const BASE_FARE_PRICE = 10;
    if (!driverId || !bookingId) {
        res.status(400).json({ message: "driverId and bookingId in not valid" });
        return;
    }
    try {
        const driver = await DriverModels_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found!!" });
            return;
        }
        const activeShift = await DriverModels_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
        if (!activeShift) {
            res.status(400).json({ message: "no active shift found" });
            return;
        }
        const booking = await BookingModels_1.default.findOne({ bookingId });
        if (!booking) {
            res.status(404).json({ message: "Booking not found!!" });
            return;
        }
        if (booking.status !== "ongoing") {
            res.status(400).json({ message: "Booking is not ongoing" });
            return;
        }
        if (driver.status !== "busy") {
            res.status(400).json({ message: "Driver in not busy" });
            return;
        }
        const totalFare = BASE_FARE_PRICE * distance;
        activeShift.totalEarnings += booking.fareAmount; // Assuming fareAmount is the earnings for this trip
        activeShift.totalDistance += activeShift.distance; // Assuming distance is stored in the booking
        booking.status = "completed";
        driver.status = "available";
        booking.distance += distance;
        booking.totalFare += totalFare;
        activeShift.totalEarnings += totalFare;
        activeShift.totalDistance += distance;
        await activeShift.save();
        await booking.save();
        await driver.save();
        res.status(200).json({ message: "Ride ended successfully", booking });
    }
    catch (error) {
        res.status(500).json({ message: "Error ending the ride", error });
    }
};
exports.endRide = endRide;
const cancelRide = async (req, res) => {
    const { driverId } = req.params;
    const { bookingId } = req.body;
    if (!driverId || !bookingId) {
        res.status(400).json({ message: "DriverId and bookingId is required!!" });
        return;
    }
    try {
        const driver = await DriverModels_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found!!" });
            return;
        }
        const booking = await BookingModels_1.default.findOne({ bookingId });
        if (!booking) {
            res.status(404).json({ message: "Booking not found!!" });
            return;
        }
        if (booking.status !== "pending") {
            res.status(400).json({ message: "Booking is not pending" });
            return;
        }
        if (driver.status !== "available") {
            res.status(400).json({ message: "Driver is not available" });
            return;
        }
        booking.status = "cancelled";
        driver.status = "available";
        await booking.save();
        await driver.save();
        res.status(200).json({ message: "Ride cancelled successfully", booking });
    }
    catch (error) {
        res.status(500).json({ message: "Error cancelling the ride", error });
        return;
    }
};
exports.cancelRide = cancelRide;
// commman endpoints for drivres
const deteleallShiftsHistory = async (req, res) => {
    const { driverId } = req.params;
    if (!driverId) {
        res.status(400).json({ message: "Driverid is required!" });
        return;
    }
    try {
        const driver = await DriverModels_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Dirver not found!!" });
            return;
        }
        const shifts = await DriverModels_1.Shift.find({ driverId: driver.driverId });
        if (shifts.length === 0) {
            res.status(404).json({ message: "No Shifts found!!" });
            return;
        }
        // Delete shifts from driver schema
        driver.shifts = [];
        await driver.save();
        // Delete all shift documents
        await DriverModels_1.Shift.deleteMany({ driverId: driver.driverId });
        res.status(200).json({ message: "All shifts deleted succesfully", shifts });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting shifts", error });
        return;
    }
};
exports.deteleallShiftsHistory = deteleallShiftsHistory;
