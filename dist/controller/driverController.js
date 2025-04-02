"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.end_Ride = exports.start_Ride = exports.getBookingdeteails = exports.deteleallShiftsHistory = exports.cancelRide = exports.cofirmRide = exports.stopShift = exports.startShift = exports.getTheDriverVechicle = exports.updateDriverStatus = exports.getDriverId = void 0;
const DriverModel_1 = require("../models/DriverModel");
const ShiftModel_1 = require("../models/ShiftModel");
const BookingModels_1 = __importDefault(require("../models/BookingModels"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SettingModels_1 = require("../models/SettingModels");
// import { generateBookingId } from '../utils/generateId'; // You'll need to create this utility function
const getDriverId = (token) => {
    if (!token)
        return null;
    try {
        const secret = process.env.JWT_SECRET || "cypress"; // Ensure this is set in your .env file
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return decoded.id || null;
    }
    catch (error) {
        console.error("Invalid or expired token:", error);
        return null;
    }
};
exports.getDriverId = getDriverId;
const updateDriverStatus = async (req, res) => {
    const { driverId } = req.params;
    const { status } = req.body;
    if (!["available", "busy", "not working"].includes(status)) {
        res.status(400).json({ message: "Invaild status value" });
        return;
    }
    try {
        const driver = await DriverModel_1.Driver.findOneAndUpdate({ driverId }, { status }, { new: true });
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
const getTheDriverVechicle = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]; // Get the token from the Authorization header
    const driverId = (0, exports.getDriverId)(token);
    try {
        console.log("driverId ====> ", driverId);
        if (!driverId) {
            res.status(400).json({ message: "DriverID not valild" });
            return;
        }
        const driver = await DriverModel_1.Driver.findOne({ driverId });
        console.log("Driver ===> ", driver);
        if (!driver) {
            res.status(404).json({ message: "Driver not found!!" });
            return;
        }
        const drivercar = await DriverModel_1.Driver.aggregate([
            {
                $match: {
                    driverId: driverId
                }
            },
            {
                $lookup: {
                    from: "vehicles",
                    localField: "vehicle",
                    foreignField: "_id",
                    as: "vehicleDetails"
                }
            },
            {
                $unwind: {
                    path: "$vehicleDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    drivername: 1,
                    email: 1,
                    vehicle: 1,
                    "vehicleDetails.make": 1,
                    "vehicleDetails.vehicleModel": 1,
                    "vehicleDetails.year": 1,
                    "vehicleDetails.status": 1
                }
            }
        ]);
        console.log("drivercar ===> ", drivercar);
        if (!drivercar) {
            res.status(404).json({ message: "Driver have not assign with any vechicle" });
            return;
        }
        res.status(200).json({ message: "Driver vechicle retrieved successfilly", vechicle: drivercar });
    }
    catch (error) {
        res.status(500).json({ message: "Error retreving driver vechicle", error });
    }
};
exports.getTheDriverVechicle = getTheDriverVechicle;
const startShift = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const driverId = (0, exports.getDriverId)(token);
    const { vehicleUsed } = req.body;
    try {
        const driver = await DriverModel_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found" });
            return;
        }
        if (!driver.vehicle.includes(vehicleUsed)) {
            res.status(400).json({ message: "Invalid vehicle" });
            return;
        }
        const activeShift = await ShiftModel_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
        if (activeShift) {
            res.status(400).json({ message: "A shift is already active" });
            return;
        }
        const startTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        const startDate = new Date().toLocaleDateString();
        const startTimeFormatted = `${startTime}, ${startDate}`;
        const startMonth = new Date().toLocaleString('default', { month: 'long' });
        const startWeek = Math.ceil(new Date().getDate() / 7);
        const newShift = {
            driverId,
            startTime,
            startDate,
            startTimeFormatted,
            startMonth,
            startWeek,
            endTime: null,
            vehicleUsed,
            totalEarnings: 0,
            totalTrips: 0,
            totalDistance: 0,
            isActive: true,
        };
        const shift = new ShiftModel_1.Shift(newShift);
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
        const driver = await DriverModel_1.Driver.findOne({ driverId }).populate("shifts");
        if (!driver) {
            res.status(404).json({ message: "Not active shift found!" });
            return;
        }
        const activeShift = await ShiftModel_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
        if (!activeShift) {
            res.status(400).json({ message: "No active shift found!!" });
            return;
        }
        const endTimenow = new Date().toLocaleTimeString();
        // Calculate total shift duration
        const startTime = new Date(`1970-01-01 ${activeShift.startTime}`);
        console.log("activeShift.startTime ======> ", activeShift.startTime);
        console.log("startTime ==> ", startTime);
        const endTime = new Date(`1970-01-01 ${endTimenow}`);
        console.log("endTime ==>", endTime);
        const durationMs = endTime.getTime() - startTime.getTime();
        console.log("durationMs ==> ", durationMs);
        // Convert to hours and minutes
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        console.log("hours ====> ", hours);
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        console.log("minutes ====> ", minutes);
        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        console.log("seconds ====> ", seconds);
        activeShift.endTime = endTimenow;
        activeShift.isActive = false;
        activeShift.totalDuration = `${hours}h ${minutes}m ${seconds}s`;
        await activeShift.save();
        await driver.save();
        res.status(200).json({
            message: "Shift ended",
            shift: activeShift,
            shiftDuration: activeShift.totalDuration
        });
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
        const driver = await DriverModel_1.Driver.findOne({ driverId });
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
// export const startRide = async (req: Request, res: Response) => {
//   const { driverId } = req.params;
//   const { bookingId } = req.body;
//   if (!driverId || !bookingId) {
//     res.status(400).json({ message: "driverId and bookingId are requried" })
//     return;
//   }
//   try {
//     const driver = await Driver.findOne({ driverId });
//     if (!driver) {
//       res.status(404).json({ message: "Driver not found!!" });
//       return; 
//     }
//     const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
//     if (!activeShift) {
//       res.status(400).json({ message: "no active shift found" });
//       return;
//     }
//     const booking = await BookingModels.findOne({ bookingId });
//     if (!booking) {
//       res.status(404).json({ message: "Booking not found!!" });
//       return;
//     }
//     if (booking.status !== "accepted") {
//       res.status(400).json({ message: "Booking is not accepted" });
//       return;
//     }
//     if (driver.status !== "available") {
//       res.status(400).json({ message: "Driver is not available" });
//       return;
//     }
//     const pickupDate = new Date();
//     activeShift.totalTrips += 1;0
//     // booking.arrived = new Date().toISOString();
//     booking.arrived = true;
//     booking.status = "ongoing";
//     booking.driver = driver._id as Types.ObjectId;
//     driver.status = "busy";
//     await activeShift.save();
//     await booking.save();
//     await driver.save();
//     res.status(200).json({ message: "Ride started successfully", booking });
//   }
//   catch (error) {
//     res.status(500).json({ message: "Error starting the ride", error });
//   }
// }
// export const endRide = async (req: Request, res: Response) => {
//   const { driverId } = req.params;
//   const { bookingId, distance } = req.body;
//   if (!driverId || !bookingId) {
//     res.status(400).json({ message: "driverId and bookingId in not valid" });
//     return;
//   }
//   try {
//     const settings = await SettingSchemaModel.findOne();
//     if(!settings){
//       res.status(404).json({message:"No settting found!!"});
//       return;
//     }
//     const BASE_FARE_PRICE = settings.basePrice;
//     const driver = await Driver.findOne({ driverId });
//     if (!driver) {
//       res.status(404).json({ message: "Driver not found!!" });
//       return;
//     }
//     const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
//     if (!activeShift) {
//       res.status(400).json({ message: "no active shift found" });
//       return;
//     }
//     const booking = await BookingModels.findOne({ bookingId });
//     if (!booking) {
//       res.status(404).json({ message: "Booking not found!!" });
//       return;
//     }
//     if (booking.status !== "ongoing") {
//       res.status(400).json({ message: "Booking is not ongoing" });
//       return;
//     }
//     if (driver.status !== "busy") {
//       res.status(400).json({ message: "Driver in not busy" });
//       return;
//     }
//     const totalFare = BASE_FARE_PRICE * distance;
//     const time = new Date();
//     activeShift.totalEarnings += booking.fareAmount; // Assuming fareAmount is the earnings for this trip
//     activeShift.totalDistance += activeShift.distance; // Assuming distance is stored in the booking
//     booking.status = "completed";
//     driver.status = "available";
//     booking.distance += distance;
//     booking.totalFare += totalFare;
//     booking.dropdownDate = time.toISOString().split("T")[0];
//     booking.dropdownTime = time.toISOString();
//     activeShift.totalEarnings += totalFare;
//     activeShift.totalDistance += distance;
//     await activeShift.save();
//     await booking.save();
//     await driver.save();
//     res.status(200).json({ message: "Ride ended successfully", booking });
//   }
//   catch (error) {
//     res.status(500).json({ message: "Error ending the ride", error });
//   }
// }
const cancelRide = async (req, res) => {
    const { driverId } = req.params;
    const { bookingId } = req.body;
    if (!driverId || !bookingId) {
        res.status(400).json({ message: "DriverId and bookingId is required!!" });
        return;
    }
    try {
        const driver = await DriverModel_1.Driver.findOne({ driverId });
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
        const driver = await DriverModel_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Dirver not found!!" });
            return;
        }
        const shifts = await ShiftModel_1.Shift.find({ driverId: driver.driverId });
        if (shifts.length === 0) {
            res.status(404).json({ message: "No Shifts found!!" });
            return;
        }
        // Delete shifts from driver schema
        driver.shifts = [];
        await driver.save();
        // Delete all shift documents
        await ShiftModel_1.Shift.deleteMany({ driverId: driver.driverId });
        res.status(200).json({ message: "All shifts deleted succesfully", shifts });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting shifts", error });
        return;
    }
};
exports.deteleallShiftsHistory = deteleallShiftsHistory;
const getBookingdeteails = async (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) {
        res.status(400).json({ message: 'Not a vaild bookingId' });
    }
    try {
        const bookings = await BookingModels_1.default.findOne({ bookingId });
        console.log("Bookings ==> ", bookings);
    }
    catch (error) {
        res.status(500).json({ message: "Error to fetching the booking" });
    }
};
exports.getBookingdeteails = getBookingdeteails;
// new api endpoints
const start_Ride = async (req, res) => {
    const { driverId } = req.params;
    const { customerName, phoneNumber, pickup: { latitude, longitude, address } } = req.body;
    // Validate required fields
    if (!driverId || !customerName || !phoneNumber ||
        !latitude || !longitude || !address) {
        res.status(400).json({
            message: "All fields are required: customerName, phoneNumber, and pickup location"
        });
        return;
    }
    try {
        // Check if driver exists
        const driver = await DriverModel_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found!" });
            return;
        }
        // Check for active shift
        const activeShift = await ShiftModel_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
        if (!activeShift) {
            res.status(400).json({ message: "No active shift found" });
            return;
        }
        console.log(" latitude, longitude, address  ==> ", latitude, longitude, address);
        // Generate booking ID (you'll need to implement this function)
        const bookingId = generateBookingId();
        // Create new booking
        const newBooking = new BookingModels_1.default({
            bookingId,
            customerName,
            phoneNumber,
            pickup: {
                latitude,
                longitude,
                address
            },
            dropOff: {
                latitude: null,
                longitude: null,
                address: null
            },
            pickuptime: new Date().toLocaleTimeString(),
            pickupDate: new Date().toLocaleDateString(),
            pickupTimeFormatted: new Date().toISOString(),
            pickupMonth: new Date().toLocaleString('default', { month: 'long' }),
            pickupWeek: Math.ceil(new Date().getDate() / 7),
            driver: driver._id,
            status: "ongoing",
            arrived: true,
            paymentStatus: "pending",
            paymentMethod: "cash" // Default payment method
        });
        // Update driver status
        driver.status = "busy";
        activeShift.totalTrips += 1;
        // Save all changes
        await Promise.all([
            newBooking.save(),
            driver.save(),
            activeShift.save()
        ]);
        res.status(200).json({
            message: "Ride started successfully",
            booking: newBooking
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error starting the ride", error });
    }
};
exports.start_Ride = start_Ride;
// Utility function to generate booking ID (create in separate file)
function generateBookingId() {
    const prefix = 'BK';
    console.log('prefix:', prefix);
    const timestamp = Date.now().toString().slice(-6);
    console.log('timestamp:', timestamp);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    console.log('random:', random);
    return `${prefix}${timestamp}${random}`;
}
const end_Ride = async (req, res) => {
    const { driverId } = req.params;
    const { bookingId, distance, dropOff: { latitude: dropLatitude, longitude: dropLongitude, address: dropAddress } } = req.body;
    if (!driverId || !bookingId || !dropLatitude || !dropLongitude || !dropAddress) {
        res.status(400).json({ message: "driverId, bookingId, and drop-off location are required" });
        return;
    }
    try {
        const settings = await SettingModels_1.SettingSchemaModel.findOne();
        if (!settings) {
            res.status(404).json({ message: "No setting found!!" });
            return;
        }
        const BASE_FARE_PRICE = settings.basePrice;
        const driver = await DriverModel_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver not found!!" });
            return;
        }
        const activeShift = await ShiftModel_1.Shift.findOne({ driverId: driver.driverId, isActive: true });
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
            res.status(400).json({ message: "Driver is not busy" });
            return;
        }
        const totalFare = BASE_FARE_PRICE * distance;
        // const time = new Date();
        activeShift.totalEarnings += booking.fareAmount; // Assuming fareAmount is the earnings for this trip
        activeShift.totalDistance += activeShift.distance; // Assuming distance is stored in the booking
        booking.status = "completed";
        driver.status = "available";
        booking.distance += distance;
        booking.totalFare += totalFare;
        booking.dropdownDate = new Date().toLocaleDateString();
        booking.dropdownTime = new Date().toLocaleTimeString();
        booking.dropOff = {
            latitude: dropLatitude,
            longitude: dropLongitude,
            address: dropAddress
        };
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
exports.end_Ride = end_Ride;
