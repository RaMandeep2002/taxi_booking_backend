"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getsetting = exports.updateSettings = exports.setting = exports.getBookingdeteails = exports.gettingReport = exports.deleteBookingdata = exports.removeVehicle = exports.updateVehicleInfomation = exports.getDriverWithVehicleandshifts = exports.getDriverWithVehicle = exports.getDriverListWithVehicle = exports.getDriverWithVehicleexculudeDriver = exports.registerVehicle = exports.deleteDriver = exports.upadateDriver = exports.getDriverDetails = exports.addMultipleDrivers = exports.adddriver = exports.getAdminInfo = void 0;
const User_1 = __importDefault(require("../models/User"));
const VehicleModel_1 = require("../models/VehicleModel");
const DriverModel_1 = require("../models/DriverModel");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const BookingModels_1 = __importDefault(require("../models/BookingModels"));
const mongoose_1 = __importDefault(require("mongoose"));
const roles_1 = require("../types/roles");
const redis_1 = __importDefault(require("../config/redis"));
const fs_1 = __importDefault(require("fs"));
const fast_csv_1 = require("fast-csv");
const DriverSchema_1 = require("../schema/DriverSchema");
const SettingModels_1 = require("../models/SettingModels");
const SettingSchema_1 = require("../schema/SettingSchema");
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
    console.log("Enter ===> ");
    const validationResult = DriverSchema_1.DriverAddSchema.safeParse(req.body);
    console.log("validationResult ==> ", validationResult);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { drivername, email, driversLicenseNumber, phoneNumber, password } = validationResult.data;
    try {
        if (!driversLicenseNumber) {
            res.status(400).json({ message: "driversLicenseNumber is required!" });
            return;
        }
        const existingDriver = await DriverModel_1.Driver.findOne({ email });
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
        const driver = new DriverModel_1.Driver({
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
const addMultipleDrivers = async (req, res) => {
    const { drivers } = req.body; // Expecting an array of driver objects
    if (!Array.isArray(drivers) || drivers.length === 0) {
        res.status(400).json({ message: "Invalid input. Expected an array of drivers." });
        return;
    }
    const validationResults = drivers.map(driver => DriverSchema_1.DriverAddSchema.safeParse(driver));
    // Check if all inputs are valid
    const invalidResults = validationResults.filter(result => !result.success);
    if (invalidResults.length > 0) {
        res.status(400).json({
            message: "Validation errors in some drivers",
            errors: invalidResults.map(result => result.error.errors),
        });
        return;
    }
    try {
        const processedDrivers = await Promise.all(validationResults.map(async (result) => {
            if (!result.success)
                return null;
            const { drivername, email, driversLicenseNumber, phoneNumber, password } = result.data;
            // Check if email already exists
            const existingDriver = await DriverModel_1.Driver.findOne({ email });
            if (existingDriver)
                return null; // Skip if driver exists
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = new User_1.default({
                name: drivername,
                email,
                password: hashedPassword,
                role: roles_1.Roles.Driver,
            });
            await user.save();
            return {
                driverId: user._id,
                drivername,
                email,
                driversLicenseNumber,
                phoneNumber,
                password: hashedPassword,
                vehicle: [],
                shifts: [],
                status: "available",
                location: { latitude: 0, longitude: 0 },
            };
        }));
        // Filter out null values (skipped existing drivers)
        const validDrivers = processedDrivers.filter(driver => driver !== null);
        if (validDrivers.length === 0) {
            res.status(400).json({ message: "No new drivers were added." });
            return;
        }
        // Insert all valid drivers in one go
        await DriverModel_1.Driver.insertMany(validDrivers);
        res.status(201).json({
            message: `${validDrivers.length} drivers added successfully`,
            addedDrivers: validDrivers.map(({ drivername, email, driversLicenseNumber, phoneNumber }) => ({
                drivername,
                email,
                driversLicenseNumber,
                phoneNumber,
            })),
        });
    }
    catch (error) {
        res.status(500).json({ message: "Something went wrong!", error });
    }
};
exports.addMultipleDrivers = addMultipleDrivers;
// export const getDriverDetails = async (req: Request, res: Response) => {
//   try {
//     const cacheKey = "drivers:list";
//     const cachedDrivers = await redisClinet.get(cacheKey);
//     if (cachedDrivers) {
//       res.status(200).json({
//         success: true,
//         message: "Driver data fetched from cache",
//         data: JSON.parse(cachedDrivers),
//       });
//       return;
//     }
//     const drivers = await Driver.find();
//     if (!drivers || drivers.length === 0) {
//       res.status(404).json({ success: false, message: "No drivers found" });
//       return;
//     }
//     await redisClinet.setEx(cacheKey, 3600, JSON.stringify(drivers));
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
const getDriverDetails = async (req, res) => {
    try {
        const drivers = await DriverModel_1.Driver.find();
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
const upadateDriver = async (req, res) => {
    const { driverId } = req.params;
    const validationResult = DriverSchema_1.DriverAddSchema.safeParse(req.body);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { drivername: name, email, phoneNumber } = validationResult.data;
    try {
        const updateDriver = await DriverModel_1.Driver.findOneAndUpdate({ driverId }, { $set: { name, email, phoneNumber } }, { new: true });
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
        const deleteDriver = await DriverModel_1.Driver.findOneAndDelete({ driverId });
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
    console.log(req.body);
    const validationResult = DriverSchema_1.registerVehicleSchema.safeParse(req.body);
    console.log("validation result ==> ", validationResult);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { make, vehicleModel, year, status } = validationResult.data;
    try {
        if (!make || !vehicleModel || !year) {
            res.status(400).json({ message: "Make, model, and year are required!" });
            return;
        }
        const { registrationNumber } = generateRandomRegistrationNumber(); // Fix function name
        console.log("Driver Id ===> ", driverId);
        const driver = await DriverModel_1.Driver.findOne({ driverId }).populate("vehicle");
        console.log(driver);
        if (!driver) {
            res.status(404).json({ message: "Driver not found!" });
            return;
        }
        const newVehicle = new VehicleModel_1.Vehicle({
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
        const updatedDriver = await DriverModel_1.Driver.findOne({ driverId }).populate("vehicle");
        console.log("updatedDriver ===> ", updatedDriver);
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
        const drivers = await DriverModel_1.Driver.find().populate("vehicle");
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
        const drivers = await DriverModel_1.Driver.find().populate("vehicle");
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
        const driver = await DriverModel_1.Driver.findById(driverId).populate("vehicle");
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
        const driver = await DriverModel_1.Driver.findById(driverId).populate("vehicle").populate("shifts");
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
    const validationResult = DriverSchema_1.registerVehicleSchema.safeParse(req.body);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { make, vehicleModel, year, status } = validationResult.data;
    try {
        const vehicle = await VehicleModel_1.Vehicle.findOne({ registrationNumber });
        if (!vehicle) {
            res.status(404).json({ message: "Vehicle not found" });
            return;
        }
        const driver = await DriverModel_1.Driver.findOne({ driverId });
        if (!driver) {
            res.status(404).json({ message: "Driver doest exist!!" });
            return;
        }
        const updateDriver = await DriverModel_1.Driver.findOneAndUpdate({ driverId, registrationNumber }, { $set: { make, vehicleModel, year, status } }, { new: true });
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
        const existingDriver = await DriverModel_1.Driver.findOne({ driverId });
        if (!existingDriver) {
            res.status(404).json({ message: "Driver doesn't exist for this id" });
            return;
        }
        const existingVehicle = await VehicleModel_1.Vehicle.findOne({ registrationNumber });
        if (!existingVehicle) {
            res.status(404).json({ message: "Vehicle is not found" });
            return;
        }
        // Remove vehicle from driver's vehicle array
        await DriverModel_1.Driver.findOneAndUpdate({ driverId }, { $unset: { vehicle: "" } });
        // Delete the vehicle document
        const removedVehicle = await VehicleModel_1.Vehicle.findOneAndDelete({
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
const gettingReport = async (req, res) => {
    try {
        const bookings = await BookingModels_1.default.aggregate([
            {
                $lookup: {
                    from: "drivers",
                    localField: "driver",
                    foreignField: "_id",
                    as: "driver",
                },
            },
            { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "vehicles",
                    localField: "driver.vehicle",
                    foreignField: "_id",
                    as: "driver.vehicles",
                },
            },
            { $unwind: { path: "$driver.vehicles", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    bookingId: 1,
                    customerName: 1,
                    phoneNumber: 1,
                    pickup: 1,
                    dropOff: 1,
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
                    // Vehicle details
                    "driver.vehicles._id": 1,
                    "driver.vehicles.registrationNumber": 1,
                    "driver.vehicles.make": 1,
                    "driver.vehicles.vehicleModel": 1,
                    "driver.vehicles.year": 1,
                },
            },
        ]);
        if (!bookings.length) {
            res.status(404).json({ message: "No bookings found" });
            return;
        }
        const filepath = "bookings.csv";
        const writeableStream = fs_1.default.createWriteStream(filepath);
        const csvStream = (0, fast_csv_1.format)({ headers: true });
        csvStream.pipe(writeableStream);
        bookings.forEach((booking) => {
            csvStream.write({
                Booking_ID: booking.bookingId,
                PICKUP_DATE: booking.pickupDate,
                PICKUP_TIME: booking.pickupTimeFormatted,
                PICKUP_MONTH: booking.pickupMonth,
                PICKUP_WEEK: booking.pickupWeek,
                ARRIVED: booking.arrived,
                CONTACT: booking.driver.phoneNumber,
                FINISH_DATE: booking.dropdownDate,
                FINISH_TIME: booking.dropdownTime,
                CUSTOMER_PHONE: booking.phoneNumber,
                ADDRESS: booking.pickup?.address || "N/A",
                VEHICLE: booking.driver.vehicles?.make || "N/A",
            });
        });
        csvStream.end();
        writeableStream.on("finish", () => {
            res.download(filepath, "bookings.csv", (err) => {
                if (err) {
                    console.error("Error sending file:", err);
                    res.status(500).json({ message: "Error generating CSV file." });
                }
                fs_1.default.unlinkSync(filepath);
            });
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.gettingReport = gettingReport;
const getBookingdeteails = async (req, res) => {
    try {
        // console.log("enter ================>");
        // console.log("Booking Id ===> ", bookingId);
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
                    phoneNumber: 1,
                    pickup: 1,
                    dropOff: 1,
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
                    //vehicle details
                    "driver.vehicles._id": 1,
                    "driver.vehicles.registrationNumber": 1,
                    "driver.vehicles.make": 1,
                    "driver.vehicles.vehicleModel": 1,
                    "driver.vehicles.year": 1,
                },
            },
        ]);
        if (!bookings || !bookings?.length) {
            res.status(404).json({ message: "no booking found!!" });
        }
        console.log("Bookings ==> ", bookings);
        res.status(200).json({ message: "Bookings data ===> ", bookings: bookings, total: bookings.length });
    }
    catch (error) {
        res.status(500).json({ message: "Error to fetching the booking" });
    }
};
exports.getBookingdeteails = getBookingdeteails;
const setting = async (req, res) => {
    const validationResult = SettingSchema_1.SettingSchema.safeParse(req.body);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { basePrice, pricePerKm } = validationResult.data;
    if (!basePrice || !pricePerKm) {
        res.status(400).json({ message: "Both base basePrice and pricePerkm is required!" });
        return;
    }
    try {
        let settings = await SettingModels_1.SettingSchemaModel.findOne();
        if (settings) {
            settings.basePrice = basePrice;
            settings.pricePerKm = pricePerKm;
            await settings.save();
        }
        else {
            settings = new SettingModels_1.SettingSchemaModel({ basePrice, pricePerKm });
            await settings.save();
        }
        res.status(200).json({ message: "Setting Update Successfully", settings });
    }
    catch (error) {
        res.status(500).json({ message: "Something worng!!", error });
    }
};
exports.setting = setting;
const updateSettings = async (req, res) => {
    const validationResult = SettingSchema_1.SettingSchema.safeParse(req.body);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { basePrice, pricePerKm } = validationResult.data;
    if (!basePrice || !pricePerKm) {
        res.status(400).json({ message: "Both base basePrice and pricePerkm is required!" });
        return;
    }
};
exports.updateSettings = updateSettings;
const getsetting = async (req, res) => {
    try {
        const settings = await SettingModels_1.SettingSchemaModel.find();
        if (!settings) {
            res.status(404).json({ message: "Settings not found!!" });
            return;
        }
        res.status(200).json({ message: "Setting fetch Successfully", settings });
    }
    catch (error) {
        res.status(500).json({ message: "Something worng!!", error });
    }
};
exports.getsetting = getsetting;
