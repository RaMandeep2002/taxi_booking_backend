"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingdeteails = exports.gettingReport = exports.deleteBookingdata = exports.removeVehicle = exports.updateVehicleInfomation = exports.getDriverWithVehicleandshifts = exports.getDriverWithVehicle = exports.getDriverListWithVehicle = exports.getDriverWithVehicleexculudeDriver = exports.registerVehicle = exports.deleteDriver = exports.upadateDriver = exports.getDriverDetails = exports.adddriver = exports.getAdminInfo = void 0;
const User_1 = __importDefault(require("../models/User"));
const DriverModels_1 = require("../models/DriverModels");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const BookingModels_1 = __importDefault(require("../models/BookingModels"));
const mongoose_1 = __importDefault(require("mongoose"));
const roles_1 = require("../types/roles");
const redis_1 = __importDefault(require("../config/redis"));
const fs_1 = __importDefault(require("fs"));
const fast_csv_1 = require("fast-csv");
const generatoRandomCredentials = () => {
    const id = crypto_1.default.randomBytes(4).toString("hex");
    const password = crypto_1.default.randomBytes(8).toString("hex");
    return { id, password };
};
const generateRandomRegistrationNumber = () => {
    const registrationNumber = crypto_1.default.randomBytes(8).toString("hex");
    return { registrationNumber };
};
// export const getAdminInfo = async (req: AuthRequest, res: Response) => {
//   try {
//     if (!req.user || !req.user.id) {
//       res.status(401).json({ message: "Unauthorized access" });
//       return;
//     }
//     const admin = await User.findOne({ _id: req.user.id }).select("-password");
//     if (!admin || admin.role !== "admin") {
//       res.status(404).json({ message: "Admin not found" });
//       return;
//     }
//     res.status(200).json({ message: "Admin data", admin });
//   } catch (error) {
//     console.error("Error fetching admin info:", error);
//     throw new Error("Failed to fetch admin information");
//   }
// };
const getAdminInfo = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: "Unauthorized access" });
            return;
        }
        const adminId = req.user.id;
        const cacheKey = `admin:${adminId}`;
        // Check Redis cache
        const cachedAdmin = await redis_1.default.get(cacheKey);
        if (cachedAdmin) {
            res.status(200).json({
                message: "Admin data (from cache)",
                admin: JSON.parse(cachedAdmin),
            });
            return; // ✅ Ensure function exits after sending response
        }
        // Fetch from MongoDB if not in cache
        const admin = await User_1.default.findOne({ _id: adminId }).select("-password");
        if (!admin || admin.role !== "admin") {
            res.status(404).json({ message: "Admin not found" });
            return;
        }
        // Store in Redis (cache for 1 hour)
        await redis_1.default.setEx(cacheKey, 3600, JSON.stringify(admin));
        res.status(200).json({ message: "Admin data (from DB)", admin });
    }
    catch (error) {
        console.error("Error fetching admin info:", error);
        res.status(500).json({ message: "Failed to fetch admin information" }); // ✅ Proper error handling
    }
};
exports.getAdminInfo = getAdminInfo;
const adddriver = async (req, res) => {
    const { drivername, email, driversLicenseNumber, phoneNumber, password } = req.body;
    try {
        if (!driversLicenseNumber) {
            res.status(400).json({ message: "driversLicenseNumber is required!" });
            return;
        }
        const existingDriver = await DriverModels_1.Driver.findOne({ email });
        if (existingDriver) {
            res
                .status(400)
                .json({ message: "Driver eith this email already exists!" });
            return;
        }
        // const { id, password } = generatoRandomCredentials();
        // console.log(id, password);
        const hashedpassword = await bcryptjs_1.default.hash(password, 10);
        const user = new User_1.default({
            name: drivername,
            email,
            password: hashedpassword,
            role: roles_1.Roles.Driver,
        });
        await user.save();
        const driver = new DriverModels_1.Driver({
            driverId: user._id,
            drivername,
            email,
            driversLicenseNumber,
            phoneNumber,
            password: hashedpassword,
            vehicle: [], // Initialize with an empty array of vehicles
            shifts: [], // Initialize with an empty array of shifts
            status: "available", // Default status
            location: { latitude: 0, longitude: 0 }, // Default location
        });
        await driver.save();
        res.status(201).json({
            message: "Driver added Successfully",
            driver: { drivername, email, driversLicenseNumber, phoneNumber },
        });
    }
    catch (error) {
        res.status(400).json({ messge: "Something went worng!", error });
    }
};
exports.adddriver = adddriver;
const getDriverDetails = async (req, res) => {
    try {
        const cacheKey = "drivers:list";
        const cachedDrivers = await redis_1.default.get(cacheKey);
        if (cachedDrivers) {
            res.status(200).json({
                success: true,
                message: "Driver data fetched from cache",
                data: JSON.parse(cachedDrivers),
            });
            return;
        }
        const drivers = await DriverModels_1.Driver.find();
        if (!drivers || drivers.length === 0) {
            res.status(404).json({ success: false, message: "No drivers found" });
            return;
        }
        await redis_1.default.setEx(cacheKey, 3600, JSON.stringify(drivers));
        res.status(200).json({
            success: true,
            messge: "Driver Fetch successfully",
            data: drivers,
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Error fetching drivers", error });
    }
};
exports.getDriverDetails = getDriverDetails;
// export const getDriverDetails = async (req: Request, res: Response) => {
//   try {
//     const drivers = await Driver.find();
//     res.status(200).json({
//       success: true,
//       messge: "Driver Fetch successfully",
//       data: drivers,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ success: false, message: "Error fetching drivers", error });
//   }
// };
const upadateDriver = async (req, res) => {
    const { driverId } = req.params;
    const { name, email, phoneNumber } = req.body;
    try {
        const updateDriver = await DriverModels_1.Driver.findOneAndUpdate({ driverId }, { $set: { name, email, phoneNumber } }, { new: true });
        if (!updateDriver) {
            res.status(404).json({ message: "Driver not found" });
            return;
        }
        res
            .status(200)
            .json({ message: "Driver update successfully", updateDriver });
    }
    catch (error) {
        res.status(500).json({ message: "Error Updating Drvier", error });
    }
};
exports.upadateDriver = upadateDriver;
const deleteDriver = async (req, res) => {
    const { driverId } = req.params;
    try {
        const deleteDriver = await DriverModels_1.Driver.findOneAndDelete({ driverId });
        if (!deleteDriver) {
            res.status(404).json({ message: "Driver not found" });
            return;
        }
        res.status(200).json({ message: "Driver Deleted Successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting driver", error });
    }
};
exports.deleteDriver = deleteDriver;
const registerVehicle = async (req, res) => {
    const { driverId } = req.params;
    const { make, vehicleModel, year, status } = req.body;
    try {
        if (!make || !vehicleModel || !year) {
            res.status(400).json({ message: "Make, model, and year are required!" });
            return;
        }
        const { registrationNumber } = generateRandomRegistrationNumber(); // Fix function name
        const driver = await DriverModels_1.Driver.findOne({
            _id: new mongoose_1.default.Types.ObjectId(driverId),
        }).populate("vehicle");
        console.log(driver);
        if (!driver) {
            res.status(404).json({ message: "Driver not found!" });
            return;
        }
        const newVehicle = new DriverModels_1.Vehicle({
            registrationNumber,
            make,
            vehicleModel,
            year,
            status: status || "active",
        });
        const savedVehicle = await newVehicle.save();
        // Ensure _id is of type ObjectId before pushing
        driver.vehicle.push(savedVehicle._id);
        await driver.save();
        // Populate the driver's vehicle data
        const updatedDriver = await DriverModels_1.Driver.findById(driverId).populate("vehicle");
        // Return the updated driver data with the vehicle details
        res.status(201).json({
            message: "Vehicle registered successfully!",
            driver: updatedDriver,
        });
    }
    catch (error) {
        console.error("Error registering vehicle:", error);
        res
            .status(500)
            .json({ message: "Something went wrong!", error: error.message });
    }
};
exports.registerVehicle = registerVehicle;
const getDriverWithVehicleexculudeDriver = async (req, res) => {
    try {
        const drivers = await DriverModels_1.Driver.find().populate("vehicle");
        const formattedDrivers = drivers.map(driver => ({
            driverId: driver.driverId,
            drivername: driver.drivername,
            vehicle: driver.vehicle,
        }));
        res.status(200).json({ message: "Driver list with vehicle", formattedDrivers });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching driver list", error: error.message });
    }
};
exports.getDriverWithVehicleexculudeDriver = getDriverWithVehicleexculudeDriver;
const getDriverListWithVehicle = async (req, res) => {
    try {
        const drivers = await DriverModels_1.Driver.find().populate("vehicle");
        res.status(200).json({ message: "Driver list with vehicle", drivers });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching driver list", error: error.message });
    }
};
exports.getDriverListWithVehicle = getDriverListWithVehicle;
const getDriverWithVehicle = async (req, res) => {
    const { driverId } = req.params;
    try {
        // Validate the driverId
        if (!mongoose_1.default.Types.ObjectId.isValid(driverId)) {
            res.status(400).json({ message: "Invalid driver ID!" });
            return;
        }
        // Find the driver and populate the vehicle details
        const driver = await DriverModels_1.Driver.findById(driverId).populate("vehicle");
        if (!driver) {
            res.status(404).json({ message: "Driver not found!" });
            return;
        }
        // Return the driver information with vehicle details
        res.status(200).json({
            message: "Driver information retrieved successfully!",
            driver,
        });
    }
    catch (error) {
        console.error("Error retrieving driver information:", error);
        res
            .status(500)
            .json({ message: "Something went wrong!", error: error.message });
    }
};
exports.getDriverWithVehicle = getDriverWithVehicle;
const getDriverWithVehicleandshifts = async (req, res) => {
    const { driverId } = req.params;
    try {
        // Validate the driverId
        if (!mongoose_1.default.Types.ObjectId.isValid(driverId)) {
            res.status(400).json({ message: "Invalid driver ID!" });
            return;
        }
        // Find the driver and populate the vehicle details
        const driver = await DriverModels_1.Driver.findById(driverId).populate("vehicle").populate("shifts");
        if (!driver) {
            res.status(404).json({ message: "Driver not found!" });
            return;
        }
        // Return the driver information with vehicle details
        res.status(200).json({
            message: "Driver information retrieved successfully!",
            driver,
        });
    }
    catch (error) {
        console.error("Error retrieving driver information:", error);
        res
            .status(500)
            .json({ message: "Something went wrong!", error: error.message });
    }
};
exports.getDriverWithVehicleandshifts = getDriverWithVehicleandshifts;
const updateVehicleInfomation = async (req, res) => {
    const { driverId, registrationNumber } = req.params;
    const { make, vehicleModel, year, status } = req.body;
    try {
        const vehicle = await DriverModels_1.Vehicle.findOne({ registrationNumber });
        if (!vehicle) {
            res.status(404).json({ message: "Vehicle not found" });
            return;
        }
        const driver = await DriverModels_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver doest exist!!" });
            return;
        }
        const updateDriver = await DriverModels_1.Driver.findOneAndUpdate({ driverId, registrationNumber }, { $set: { make, vehicleModel, year, status } }, { new: true });
        res
            .status(200)
            .json({ message: "Successfully updateed!!", vechicle: updateDriver });
    }
    catch (error) {
        res.status(400).json({ message: "Error Updating Vehicle", error });
    }
};
exports.updateVehicleInfomation = updateVehicleInfomation;
const removeVehicle = async (req, res) => {
    const { driverId } = req.params;
    const { registrationNumber } = req.body;
    try {
        const existingDriver = await DriverModels_1.Driver.findOne({ driverId });
        if (!existingDriver) {
            res.status(404).json({ message: "Driver doesn't exist for this id" });
            return;
        }
        const existingVehicle = await DriverModels_1.Vehicle.findOne({ registrationNumber });
        if (!existingVehicle) {
            res.status(404).json({ message: "Vehicle is not found" });
            return;
        }
        // Remove vehicle from driver's vehicle array
        await DriverModels_1.Driver.findOneAndUpdate({ driverId }, { $unset: { vehicle: "" } });
        // Delete the vehicle document
        const removedVehicle = await DriverModels_1.Vehicle.findOneAndDelete({
            registrationNumber,
        });
        if (!removedVehicle) {
            res.status(404).json({ message: "Vehicle is not found" });
            return;
        }
        res.status(200).json({ message: "Vehicle deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ message: "Error removing vehicle", error });
    }
};
exports.removeVehicle = removeVehicle;
const deleteBookingdata = async (req, res) => {
    console.log("enter ===>");
    try {
        const bookingdata = await BookingModels_1.default.find();
        if (bookingdata.length === 0) {
            res.status(404).json({ message: "No booking found to delete" });
            return;
        }
        await BookingModels_1.default.deleteMany({});
        res.status(200).json({ message: "All booking deleted successfully!" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting all booking", error });
    }
};
exports.deleteBookingdata = deleteBookingdata;
// BOOKING ID,
// PICKUP DATE,
// PICKUP TIME,
// PICKUP MONTH,
// PICKUP WEEK,
// CREATED DATE,
// CREATED TIME,
// BOOKED,
// ARRIVED,
// CONTACT,
// FINISH DATE,
// FINISH TIME,
// CUSTOMER PHONE,
// ADDRESS,
// VEHICLE TYPE,
// VEHICLE #,
// METER
const gettingReport = async (req, res) => {
    try {
        const bookings = await BookingModels_1.default.find().lean();
        if (!bookings.length) {
            res.status(404).json({ message: "No booking found" });
            return;
        }
        const filepath = "booking.csv";
        const writeablestrems = fs_1.default.createWriteStream(filepath);
        const csvStream = (0, fast_csv_1.format)({ headers: true });
        csvStream.pipe(writeablestrems);
        bookings.forEach((booking) => {
            csvStream.write({
                Booking_ID: booking._id,
                PICKUP_DATE: booking.pickupDate,
                PICKUP_TIME: booking.pickuptime,
                PICKUP_MONTH: booking.pickupMonth,
                // BOOKED:booking.booked,
                // ARRIVED:
                CUSTOMER_PHONE: booking.customerName,
                Phone_Number: booking.phoneNumber,
                ADDRESS: booking.pickup.address,
                Pickup_Latitude: booking.pickup.latitude,
                Pickup_Longitude: booking.pickup.longitude,
                Dropoff_Location: booking.dropOff.address,
                Dropoff_Latitude: booking.dropOff.latitude,
                Dropoff_Longitude: booking.dropOff.longitude,
                Fare_Amount: booking.fareAmount,
                Payment_Status: booking.paymentStatus,
                Payment_Method: booking.paymentMethod,
            });
        });
        csvStream.end();
        writeablestrems.on("finish", () => {
            res.download(filepath, "bookings.csv", (err) => {
                if (err) {
                    console.error("Error sending file:", err);
                    res.status(500).json({ message: "Error generating CSV file." });
                }
                // Optional: Delete the file after sending
                fs_1.default.unlinkSync(filepath);
            });
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.gettingReport = gettingReport;
const getBookingdeteails = async (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) {
        res.status(400).json({ message: 'Not a vaild bookingId' });
    }
    try {
        console.log("enter ================>");
        console.log("Booking Id ===> ", bookingId);
        const bookings = await BookingModels_1.default.aggregate([
            {
                $match: { bookingId }, // Match booking by bookingId
            },
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
                    preserveNullAndEmptyArrays: true, // Ensure bookings without a driver still return results
                },
            },
            {
                $project: {
                    bookingId: 1,
                    customerName: 1,
                    phoneNumber: 1,
                    pickuptime: 1,
                    pickupDate: 1,
                    pickupTimeFormatted: 1,
                    pickupMonth: 1,
                    pickupWeek: 1,
                    dropdownDate: 1,
                    dropdownTime: 1,
                    arrived: 1,
                    distance: 1,
                    totalFare: 1,
                    paymentStatus: 1,
                    status: 1,
                    // Driver details
                    "driver.driverId": 1,
                    "driver.drivername": 1,
                    "driver.email": 1,
                    "driver.phoneNumber": 1,
                    "driver.status": 1,
                    "driver.isOnline": 1,
                },
            },
        ]);
        if (!bookings || !bookings?.length) {
            res.status(404).json({ message: "no booking found!!" });
        }
        console.log("Bookings ==> ", bookings);
        res.status(200).json({ message: "Bookings data ===> ", bookings: bookings[0] });
    }
    catch (error) {
        res.status(500).json({ message: "Error to fetching the booking" });
    }
};
exports.getBookingdeteails = getBookingdeteails;
