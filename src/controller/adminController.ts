import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import { Vehicle } from "../models/VehicleModel";
import { Driver } from "../models/DriverModel";
import ScheduleRide from "../models/ScheduleRideModel";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import BookingModels from "../models/BookingModels";
import { AuthRequest } from "../types/custom";
import { Roles } from "../types/roles";
import redisClinet from "../config/redis";
import { DriverAddSchema, registerSharedVehicleSchema, registerVehicleSchema, updateDriverAddSchema, updateVehicleSchema } from "../schema/DriverSchema";
import { SettingSchemaModel } from "../models/SettingModels";
import { SettingSchema } from "../schema/SettingSchema";
import { Shift } from "../models/ShiftModel";
import fs from "fs";
import { format } from "fast-csv";
import { parse } from "date-fns";
import cron from "node-cron";
import { sendWhatsappMessage } from "../utils/whatsappMessageSender";
import { sendBookingsDetailsReportEmail, sendEmailMessage, sendEmailMessageBeforeTime } from "../utils/emailMessageSender";
import path from "path";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { record } from "zod";

const adminWhatsAppNumber = process.env.ADMIN_WHATSAPP_NUMBER!;

const generatoRandomCredentials = () => {
  const id = crypto.randomBytes(4).toString("hex");
  const password = crypto.randomBytes(8).toString("hex");
  return { id, password };
};

const generateRandomRegistrationNumber = () => {
  const registrationNumber = crypto.randomBytes(8).toString("hex");
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

export const getAllAdminInfo = async (req: Request, res: Response) => {
  console.log("admin")
  try {
    const admin = await User.find({ role: Roles.Admin });
    console.table(admin)
    if (!admin) {
      res.status(404).json({ message: "No admin information found!!" });
      return;
    }
    res.status(200).json({ message: "Admin info", data: admin });
  } catch (error) {
    res.status(500).json({ message: "Error for Fetching the Admin details!!", error });
  }

}

export const getAdminInfo = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: "Unauthorized access" });
      return;
    }

    const adminId = req.user.id;
    const cacheKey = `admin:${adminId}`;

    // Check Redis cache
    const cachedAdmin = await redisClinet.get(cacheKey);
    if (cachedAdmin) {
      res.status(200).json({
        message: "Admin data (from cache)",
        admin: JSON.parse(cachedAdmin),
      });
      return; // ✅ Ensure function exits after sending response
    }

    // Fetch from MongoDB if not in cache
    const admin = await User.findOne({ _id: adminId }).select("-password");
    if (!admin || admin.role !== "admin") {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    // Store in Redis (cache for 1 hour)
    await redisClinet.setEx(cacheKey, 3600, JSON.stringify(admin));

    res.status(200).json({ message: "Admin data (from DB)", admin });
  } catch (error) {
    console.error("Error fetching admin info:", error);
    res.status(500).json({ message: "Failed to fetch admin information" }); // ✅ Proper error handling
  }
};

export const adddriver = async (req: Request, res: Response) => {
  console.log("Enter ===> ", req.body)
  const validationResult = DriverAddSchema.safeParse(req.body);
  console.log("validationResult ==> ", validationResult);
  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.format() });
    return;
  }

  const { drivername, email, driversLicenseNumber, phoneNumber, password } =
    validationResult.data;

  try {
    if (!driversLicenseNumber) {
      res.status(400).json({ message: "driversLicenseNumber is required!" });
      return;
    }
    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      res
        .status(400)
        .json({ message: "Driver With this email already exists!" });
      return;
    }

    // const { id, password } = generatoRandomCredentials();
    // console.log(id, password);
    const hashedpassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: drivername,
      email,
      password: hashedpassword,
      role: Roles.Driver,
    });

    await user.save();

    const driver = new Driver({
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
  } catch (error: any) {
    res.status(400).json({ messge: "Something went worng!", error });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    res.status(400).json({ message: "Email and New Password are Required!" });
    return;
  }

  try {
    const driver = await Driver.findOne({ email });
    if (!driver) {
      res.status(404).json({ message: "Driver not Found!!" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User associated with driver not found." });
      return;
    }

    const hashedpassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedpassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfull" });
  }
  catch (error: any) {
    res.status(500).json({ message: "Error resseting the password!", error: error.message });
    return;
  }
}

export const addMultipleDrivers = async (req: Request, res: Response) => {
  const { drivers } = req.body; // Expecting an array of driver objects

  if (!Array.isArray(drivers) || drivers.length === 0) {
    res.status(400).json({ message: "Invalid input. Expected an array of drivers." });
    return;
  }

  const validationResults = drivers.map(driver => DriverAddSchema.safeParse(driver));

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
    const processedDrivers = await Promise.all(
      validationResults.map(async (result) => {
        if (!result.success) return null;

        const { drivername, email, driversLicenseNumber, phoneNumber, password } = result.data;

        // Check if email already exists
        const existingDriver = await Driver.findOne({ email });
        if (existingDriver) return null; // Skip if driver exists

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
          name: drivername,
          email,
          password: hashedPassword,
          role: Roles.Driver,
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
      })
    );

    // Filter out null values (skipped existing drivers)
    const validDrivers = processedDrivers.filter(driver => driver !== null);

    if (validDrivers.length === 0) {
      res.status(400).json({ message: "No new drivers were added." });
      return;
    }

    // Insert all valid drivers in one go
    await Driver.insertMany(validDrivers);

    res.status(201).json({
      message: `${validDrivers.length} drivers added successfully`,
      addedDrivers: validDrivers.map(({ drivername, email, driversLicenseNumber, phoneNumber }) => ({
        drivername,
        email,
        driversLicenseNumber,
        phoneNumber,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: "Something went wrong!", error });
  }
};

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
export const getDriverDetails = async (req: Request, res: Response) => {
  try {
    await redisClinet.del("drivers:list");
    const cacheKey = "drivers:list";

    // Try to get drivers from Redis cache
    const cachedDrivers = await redisClinet.get(cacheKey);
    if (cachedDrivers) {
      res.status(200).json({
        success: true,
        message: "Drivers fetched successfully (from cache)",
        data: JSON.parse(cachedDrivers),
      });
      return;
    }

    // If not cached, fetch from DB
    const drivers = await Driver.find().lean();

    const emails = drivers.map((driver) => driver.email);
    const users = await User.find({ email: { $in: emails } }).select("email password").lean();

    // Get all driver IDs for shift aggregation
    const driverIds = drivers.map((driver) => driver._id);

    // Aggregate total trips and earnings from Shift collection
    const shiftStats = await Shift.aggregate([
      { $match: { driverId: { $in: driverIds } } },
      {
        $group: {
          _id: "$driverId",
          totalTrips: { $sum: "$totalTrips" },
          totalEarnings: { $sum: "$totalEarnings" }
        }
      }
    ]);

    // Map driverId to stats for quick lookup
    const statsMap: Record<string, { totalTrips: number; totalEarnings: number }> = {};
    shiftStats.forEach(stat => {
      statsMap[stat._id.toString()] = {
        totalTrips: stat.totalTrips || 0,
        totalEarnings: stat.totalEarnings || 0
      };
    });

    const driverWithStats = drivers.map((driver) => {
      const user = users.find((x) => x.email === driver.email);
      const stats = statsMap[driver._id.toString()] || { totalTrips: 0, totalEarnings: 0 };
      return {
        ...driver,
        password: user?.password || null,
        totalTrips: stats.totalTrips,
        totalEarnings: stats.totalEarnings
      }
    });

    // Store in Redis for 1 hour
    await redisClinet.setEx(cacheKey, 3600, JSON.stringify(driverWithStats));

    res.status(200).json({
      success: true,
      message: "Drivers fetched successfully",
      data: driverWithStats,
    });

  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching drivers", error });
  }
};
export const upadateDriver = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const validationResult = updateDriverAddSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.errors });
    return;
  }
  const { drivername, email, phoneNumber, driversLicenseNumber, password } = validationResult.data;

  try {
    const originalDriver = await Driver.findOne({ driverId });

    if (!originalDriver) {
      res.status(404).json({ message: "Driver not found!" });
      return;
    }

    const oldEmail = originalDriver.email;

    const updateData: any = {
      drivername,
      email,
      phoneNumber,
      driversLicenseNumber,
    };

    const updatedDriver = await Driver.findOneAndUpdate(
      { driverId },
      { $set: updateData },
      { new: true }
    );

    console.log("Updated Driver --------> ", updatedDriver);

    const userUpdateData: any = {
      name: drivername,
      email,
    }


    if (password) {
      const hashedpassword = await bcrypt.hash(password, 10);
      userUpdateData.password = hashedpassword;
    }

    await User.findOneAndUpdate(
      { email: oldEmail },
      { $set: userUpdateData }
    );

    await redisClinet.del("drivers:list");

    res
      .status(200)
      .json({ message: "Driver update successfully", updatedDriver });
  } catch (error: any) {
    res.status(500).json({ message: "Error Updating Driver", error });
  }
};
export const deleteDriver = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  if (!driverId) {
    res.status(400).json({ message: "DriverId is Invaild!!" });
    return;
  }

  try {
    const originalDriver = await Driver.findOne({ driverId });
    console.log("originalDriver -----> ", originalDriver);
    if (!originalDriver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }

    const emailwhichtobedeleted = originalDriver.email;
    console.log("emailwhichtobedeleted  -----> ", emailwhichtobedeleted);

    const deleteDriver = await Driver.findOneAndDelete({ driverId });
    console.log("deleteDriver  -----> ", deleteDriver);

    if (!deleteDriver) {
      res.status(404).json({ message: "Driver not found" });
      return;
    }

    await User.findOneAndDelete({ email: emailwhichtobedeleted });

    // Delete drivers list from redis cache
    await redisClinet.del("drivers:list");

    res.status(200).json({ message: "Driver Deleted Successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting driver", error });
  }
};

export const disableDriver = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  console.log("driver id ---> ", driverId);

  if (!driverId) {
    res.status(400).json({ message: "DriverId is required" });
    return;
  }

  try {
    const driver = await Driver.findOne({ driverId });

    if (!driver) {
      res.status(404).json({ message: "No Driver found" });
      return;
    }

    const email = driver.email;
    console.log("driver_email ----> ", email);

    const user = await User.findOne({ email });

    console.log("user ----> ", user);

    if (!user) {
      res.status(404).json({ message: "User not found!!" });
      return;
    }

    const emailtodisable = user.email;

    await Driver.updateOne({ driverId }, { $set: { isActive: false } });

    await User.updateOne({ email: emailtodisable }, { $set: { status: false } });

    res.status(200).json({ message: "Driver Disble successfully!!" });
  }
  catch (error) {
    res.status(500).json({ message: "Somthing went wrong!!", error });
  }
}


export const activateDriver = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  console.log("driver id ---> ", driverId);

  if (!driverId) {
    res.status(400).json({ message: "DriverId is required" });
    return;
  }

  try {
    const driver = await Driver.findOne({ driverId });

    if (!driver) {
      res.status(404).json({ message: "No Driver found" });
      return;
    }

    const email = driver.email;
    console.log("driver_email ----> ", email);

    const user = await User.findOne({ email });

    console.log("user ----> ", user);

    if (!user) {
      res.status(404).json({ message: "User not found!!" });
      return;
    }

    const emailtodisable = user.email;

    await Driver.updateOne({ driverId }, { $set: { isActive: true } });

    await User.updateOne({ email: emailtodisable }, { $set: { status: true } });

    res.status(200).json({ message: "Driver Activate successfully!!" });
  }
  catch (error) {
    res.status(500).json({ message: "Somthing went wrong!!", error });
  }
}


export const registerVehiclewithparams = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  // console.log(req.body);
  // const validationResult = registerVehicleSchema.safeParse(req.body);
  // console.log("validation result ==> ", validationResult);
  // if (!validationResult.success) {
  //   res.status(400).json({ errors: validationResult.error.errors });
  //   return;
  // }

  const { company, vehicleModel, year, status } = req.body;

  try {
    if (!company || !vehicleModel || !year) {
      res.status(400).json({ message: "company, model, and year are required!" });
      return;
    }

    const { registrationNumber } = generateRandomRegistrationNumber(); // Fix function name
    console.log("Driver Id ===> ", driverId)
    const driver = await Driver.findOne({ driverId }).populate("vehicle");
    console.log(driver);
    if (!driver) {
      res.status(404).json({ message: "Driver not found!" });
      return;
    }

    const newVehicle = new Vehicle({
      registrationNumber,
      company,
      vehicleModel,
      year,
      status: status || "active",
    });

    const savedVehicle = await newVehicle.save();

    // Ensure _id is of type ObjectId before pushing
    driver.vehicle.push(savedVehicle._id as mongoose.Types.ObjectId);
    await driver.save();

    // Populate the driver's vehicle data
    const updatedDriver = await Driver.findOne({ driverId }).populate("vehicle");
    console.log("updatedDriver ===> ", updatedDriver)
    // Return the updated driver data with the vehicle details
    res.status(201).json({
      message: "Vehicle registered successfully!",
      driver: updatedDriver,
    });
  } catch (error: any) {
    console.error("Error registering vehicle:", error);
    res
      .status(500)
      .json({ message: "Something went wrong!", error: error.message });
  }
};


export const registerVehicle = async (req: Request, res: Response) => {
  console.log(req.body);
  const validationResult = registerVehicleSchema.safeParse(req.body);
  console.log("validation result ==> ", validationResult);
  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.errors });
    return;
  }

  const { driverId, company, vehicleModel, year, status } = validationResult.data;

  try {
    if (!driverId || !company || !vehicleModel || !year) {
      res.status(400).json({ message: "company, model, and year are required!" });
      return;
    }

    const { registrationNumber } = generateRandomRegistrationNumber(); // Fix function name
    console.log("Driver Id ===> ", driverId)
    const driver = await Driver.findOne({ driverId }).populate("vehicle");
    console.log(driver);
    if (!driver) {
      res.status(404).json({ message: "Driver not found!" });
      return;
    }

    const newVehicle = new Vehicle({
      registrationNumber,
      company,
      vehicleModel,
      year,
      status: status || "active",
    });

    const savedVehicle = await newVehicle.save();

    // Ensure _id is of type ObjectId before pushing
    driver.vehicle.push(savedVehicle._id as mongoose.Types.ObjectId);
    await driver.save();

    // Populate the driver's vehicle data
    const updatedDriver = await Driver.findOne({ driverId }).populate("vehicle");
    console.log("updatedDriver ===> ", updatedDriver)
    // Return the updated driver data with the vehicle details
    res.status(201).json({
      message: "Vehicle registered successfully!",
      driver: updatedDriver,
    });
  } catch (error: any) {
    console.error("Error registering vehicle:", error);
    res
      .status(500)
      .json({ message: "Something went wrong!", error: error.message });
  }
};

export const registerSharedVehicle = async (req: Request, res: Response) => {
  console.log(req.body);

  const validationResult = registerSharedVehicleSchema.safeParse(req.body);
  console.log("validation result ==> ", validationResult);
  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.errors });
    return;
  }

  const { company, vehicleModel, year, vehicle_plate_number } = validationResult.data;

  try {
    const { registrationNumber } = generateRandomRegistrationNumber();

    const newVehicle = new Vehicle({
      registrationNumber,
      company,
      vehicleModel,
      year,
      vehicle_plate_number,
      isShared: true,
    });

    const savedVehicle = await newVehicle.save();

    res.status(201).json({
      message: "Shared vehicle registered successfully!",
      vehicle: savedVehicle,
    });
  } catch (error: any) {
    console.error("Error registering shared vehicle:", error);
    res.status(500).json({
      message: "Something went wrong while registering shared vehicle!",
      error: error.message,
    });
  }
};

export const getDriverWithVehicleexculudeDriver = async (req: Request, res: Response) => {
  try {
    const drivers = await Driver.find().populate("vehicle");
    const formattedDrivers = drivers.map(driver => ({
      driverId: driver.driverId,
      drivername: driver.drivername,
      vehicle: driver.vehicle,
    }));
    res.status(200).json({ message: "Driver list with vehicle", formattedDrivers });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching driver list", error: error.message });
  }
};
export const getDriverListWithVehicle = async (req: Request, res: Response) => {
  try {
    const drivers = await Driver.find().populate("vehicle");
    res.status(200).json({ message: "Driver list with vehicle", drivers });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching driver list", error: error.message });
  }
};
export const getDriverWithVehicle = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  try {
    // Validate the driverId
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      res.status(400).json({ message: "Invalid driver ID!" });
      return;
    }

    // Find the driver and populate the vehicle details
    const driver = await Driver.findById(driverId).populate("vehicle");

    if (!driver) {
      res.status(404).json({ message: "Driver not found!" });
      return;
    }

    // Return the driver information with vehicle details
    res.status(200).json({
      message: "Driver information retrieved successfully!",
      driver,
    });
  } catch (error: any) {
    console.error("Error retrieving driver information:", error);
    res
      .status(500)
      .json({ message: "Something went wrong!", error: error.message });
  }
};
export const getDriverWithVehicleandshifts = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  try {
    // Validate the driverId
    if (!driverId) {
      res.status(400).json({ message: "Invalid driver ID!" });
      return;
    }

    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }
    // Find the driver and populate the vehicle details
    const driverVechicleandShift = await Driver.findOne({ driverId }).populate("vehicle").populate("shifts");

    if (!driverVechicleandShift) {
      res.status(404).json({ message: "Driver shift not found!" });
      return;
    }

    // Return the driver information with vehicle details
    res.status(200).json({
      message: "Driver information retrieved successfully!",
      driverVechicleandShift,
    });
  } catch (error: any) {
    console.error("Error retrieving driver information:", error);
    res
      .status(500)
      .json({ message: "Something went wrong!", error: error.message });
  }
};

export const updateVehicleInfomation = async (req: Request, res: Response) => {
  const { registrationNumber } = req.params;
  const validationResult = updateVehicleSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.errors });
    return;
  }

  const { company, vehicleModel, year, vehicle_plate_number } = validationResult.data;
  try {
    const vehicle = await Vehicle.findOne({ registrationNumber });
    if (!vehicle) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }

    // const driver = await Driver.findOne({ driverId });
    // if (!driver) {
    //   res.status(404).json({ message: "Driver doest exist!!" });
    //   return;
    // }

    const updateDriver = await Vehicle.findOneAndUpdate(
      { registrationNumber },
      { $set: { company, vehicleModel, year, vehicle_plate_number } },
      { new: true },
    );

    await redisClinet.del("vehicles:list");


    res
      .status(200)
      .json({ message: "Successfully updateed!!", vechicle: updateDriver });
  } catch (error) {
    res.status(400).json({ message: "Error Updating Vehicle", error });
  }
};
export const removeVehicle = async (req: Request, res: Response) => {
  const { registrationNumber } = req.params;

  if (!registrationNumber) {
    res.status(400).json({ message: "DriverId is Invaild!!" });
    return;
  }

  try {
    const existingVehicle = await Vehicle.findOne({ registrationNumber });
    if (!existingVehicle) {
      res.status(404).json({ message: "Vehicle is not found" });
      return;
    }

    // Remove vehicle from driver's vehicle array
    await Driver.findOneAndUpdate(
      { registrationNumber },
      { $unset: { vehicle: "" } }
    );

    // Delete the vehicle document
    const removedVehicle = await Vehicle.findOneAndDelete({
      registrationNumber
    });

    if (!removedVehicle) {
      res.status(404).json({ message: "Vehicle is not found" });
      return;
    }

    // Invalidate vehicles list cache in Redis
    await redisClinet.del("vehicles:list");

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error removing vehicle", error });
  }
};

export const deleteBookingdata = async (req: Request, res: Response) => {
  console.log("enter ===>");
  try {
    const bookingdata = await BookingModels.find();

    if (bookingdata.length === 0) {
      res.status(404).json({ message: "No booking found to delete" });
      return;
    }

    await BookingModels.deleteMany({});

    res.status(200).json({ message: "All booking deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting all booking", error });
  }
};
export const gettingReport = async (req: Request, res: Response) => {
  try {
    console.log("Enter");

    // Decode query params
    const rawFromDate = req.query.fromDate as string;
    const rawToDate = req.query.toDate as string;
    const pickup = req.query.pickup as string;
    const drivername = req.query.drivername as string;
    const company = req.query.company as string;

    console.log("rawFromDate -----> ", rawFromDate)
    console.log("rawToDate -----> ", rawToDate)
    console.log("pickup -----> ", pickup)
    console.log("drivername -----> ", drivername)
    console.log("company -----> ", company)

    const fromDateDecoded = rawFromDate ? decodeURIComponent(rawFromDate) : undefined;
    const toDateDecoded = rawToDate ? decodeURIComponent(rawToDate) : undefined;

    console.log("fromDateDecoded -----> ", fromDateDecoded)
    console.log("toDateDecoded -----> ", toDateDecoded)

    const matchStage: any = {};
    if (fromDateDecoded && toDateDecoded) {
      matchStage.pickupDate = {
        $gte: fromDateDecoded,
        $lte: toDateDecoded,
      };
    }

    if (pickup) {
      matchStage["pickup.address"] = { $regex: pickup, $options: "i" };
    }

    const bookings = await BookingModels.aggregate([
      { $match: matchStage },
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
          localField: "vehicleUsed",
          foreignField: "_id",
          as: "vehicleUsed"
        }
      },
      { $unwind: { path: "$vehicleUsed", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...(drivername ? { "driver.drivername": { $regex: drivername, $options: "i" } } : {}),
          ...(company ? { "vehicleUsed.vehicle_plate_number": { $regex: company, $options: "i" } } : {}),
        }
      },
      {
        $project: {
          bookingId: 1,
          customerName: 1,
          phoneNumber: 1,
          "pickup.address": 1,
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
          "driver.driverId": 1,
          "driver.drivername": 1,
          "driver.email": 1,
          "driver.phoneNumber": 1,
          "driver.status": 1,
          "driver.isOnline": 1,
          "vehicleUsed.registrationNumber": 1,
          "vehicleUsed.vehicleModel": 1,
          "vehicleUsed.year": 1,
          "vehicleUsed.company": 1,
          "vehicleUsed.vehicle_plate_number": 1,
        },
      },
    ]);

    if (!bookings.length) {
      res.status(404).json({ message: "No bookings found" });
      return;
    }

    const filepath = "bookings.csv";
    const writeableStream = fs.createWriteStream(filepath);
    const csvStream = format({ headers: true });

    csvStream.pipe(writeableStream);

    bookings.forEach((booking) => {
      csvStream.write({
        "Booking ID": booking.bookingId,
        "Pickup Date": booking.pickupDate,
        "Pickup Time": booking.pickuptime,
        "Pickup Month": booking.pickupMonth,
        "Pickup Week": booking.pickupWeek,
        "Arrived": booking.arrived,
        "Contact": booking.driver?.phoneNumber || "N/A",
        "Finish Date": booking.dropdownDate,
        "Finish Time": booking.dropdownTime,
        "Customer Phone": booking.phoneNumber,
        "Address": booking.pickup?.address || "N/A",
        "Vehicle": booking.vehicleUsed?.company || "N/A",
        "Vehicle Number": booking.vehicleUsed?.vehicle_plate_number || "N/A",
        "Meter": booking.distance,
      });
    });

    csvStream.end();

    writeableStream.on("finish", () => {
      res.download(filepath, "bookings.csv", (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).json({ message: "Error generating CSV file." });
        }
        fs.unlinkSync(filepath);
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const generateAndSendReport = async () => {
  try {
    const today = new Date();
    console.log("Today ==> ", today);

    const month = today.getMonth();
    console.info("month -----> ", month)

    // Calculate previous month (if today is July, previous month is June)
    const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;

    // First day of the previous month
    const fromDate = new Date(year, prevMonth, 1);

    // Last day of the previous month
    const toDate = new Date(year, prevMonth + 1, 0);

    console.log("From date ===> ", fromDate);
    console.log("To date ===> ", toDate);

    const PDT = 'America/Vancouver';

    console.log('fromDate in IST:', formatInTimeZone(fromDate, PDT, 'yyyy-MM-dd HH:mm:ssXXX'));
    console.log('toDate in IST:', formatInTimeZone(toDate, PDT, 'yyyy-MM-dd HH:mm:ssXXX'));

    console.log("fromDate.toISOString() ---> ", fromDate.toISOString());
    console.log("toDate.toISOString() ---> ", toDate.toISOString());

    const bookings = await BookingModels.aggregate([
      {
        $addFields: {
          pickupDateObj: {
            $dateFromString: {
              dateString: "$pickupDate",
              format: "%m/%d/%Y",
            }
          }
        }
      },
      {
        $match: {
          pickupDateObj: {
            $gte: new Date(fromDate),
            $lte: new Date(toDate),
          },
        },
      },
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
          localField: "vehicleUsed",
          foreignField: "_id",
          as: "vehicleUsed",
        },
      },
      { $unwind: { path: "$vehicleUsed", preserveNullAndEmptyArrays: true } },
      // Include shift model
      {
        $lookup: {
          from: "shifts", // Make sure your MongoDB collection for shifts is called "shifts"
          localField: "shift",
          foreignField: "_id",
          as: "shift",
        },
      },
      { $unwind: { path: "$shift", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          bookingId: 1,
          customerName: 1,
          phoneNumber: 1,
          "pickup.address": 1,
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
          "driver.driverId": 1,
          "driver.drivername": 1,
          "driver.email": 1,
          "driver.phoneNumber": 1,
          "driver.status": 1,
          "driver.isOnline": 1,
          "vehicleUsed.registrationNumber": 1,
          "vehicleUsed.vehicleModel": 1,
          "vehicleUsed.year": 1,
          "vehicleUsed.company": 1,
          "vehicleUsed.vehicle_plate_number": 1,
          // Add relevant fields from shift model - you can modify fields below as needed
          "shift.startTime": 1,
          "shift.startDate": 1,
          "shift.endTime": 1,
          "shift.endDate": 1,
        },
      },
    ]);

    console.table(bookings);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log("timestamps ---> ", timestamp)
    const filename = `booking_${timestamp}.csv`;
    const filepath = path.resolve(__dirname, "..", 'temp', filename);


    const tempDir = path.dirname(filepath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const csvData = bookings.map(booking => ({
      "Booking ID": booking.bookingId || "N/A",
      "Pickup Date": booking.pickupDate || "N/A",
      "Pickup Time": booking.pickuptime || "N/A",
      "Pickup Month": booking.pickupMonth || "N/A",
      "Pickup Week": booking.pickupWeek || "N/A",
      "Arrived": booking.arrived || "N/A",
      "Contact": booking.driver?.phoneNumber || "N/A",
      "Finish Date": booking.dropdownDate || "N/A",
      "Finish Time": booking.dropdownTime || "N/A",
      "Customer Phone": booking.phoneNumber || "N/A",
      "Address": booking.pickup?.address || "N/A",
      "Vehicle": booking.vehicleUsed?.company || "N/A",
      "Vehicle Number": booking.vehicleUsed?.vehicle_plate_number || "N/A",
      "Meter": booking.distance || "N/A",
      "Shift Start Time": booking.shift?.startTime || "N/A",
      "Shift Start Date": booking.shift?.startDate || "N/A",
      "Shift End Time": booking.shift?.endTime || "N/A",
      "Shift End Date": booking.shift?.endDate || "N/A",
    }));

    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(filepath);
      const csvStream = format({ headers: true });

      csvStream.pipe(writeStream);

      csvData.forEach(row => {
        csvStream.write(row);
      })

      csvStream.end();

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    })


    console.log(`📄 CSV file created: ${filepath}`);

    try {
      // await sendBookingsDetailsReportEmail(
      //   "salmonarmtaxis@gmail.com",
      //   "ramandeepsingh1511@gmail.com,CPVData@gov.bc.ca,Salmonarmtaxi@hotmail.com,",
      //   filepath
      // );
      await sendBookingsDetailsReportEmail(
        "ramandeepsingh1511@gmail.com",
        // "ramandeepsingh1511@gmail.com,CPVData@gov.bc.ca,Salmonarmtaxi@hotmail.com,",
        filepath
      );
      console.log("📧 Report emailed successfully!");
      return { success: true, recordCount: bookings.length }
    } catch (error) {
      console.error("📧 Report emailed Failed..");
      throw error;
    } finally {
      try {
        fs.unlinkSync(filepath);
        console.log("🗑️ Temporary file cleaned up successfully");
      } catch (unlinkErr) {
        console.error("⚠️ Failed to delete temporary file:", unlinkErr);
      }
    }
  } catch (err) {
    console.error("Error in generating report and sending email:", err);
    throw err;
  }
};


export const gettingReportAndSendEmail = async (req: Request, res: Response) => {
  try {
    const result = await generateAndSendReport();

    res.status(200).json({
      message: "Report generator and Emailed successfully!",
      recordcount: result?.recordCount,
      emailSent: true
    })
  } catch (error) {
    console.error("Error in generating report and sending email:", error);
    res.status(500).json({ message: "Internal server error", error })
  }
}


// Helper to parse MM/DD/YYYY to Date object
const parseDate = (dateStr: string): Date => {
  const [month, day, year] = dateStr.split("/");
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
};

export const getBookingdeteails = async (req: Request, res: Response) => {
  try {
    const bookings = await BookingModels.aggregate([
      // Lookup driver
      {
        $lookup: {
          from: "drivers",
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

      // Lookup vehicle from vehicleUsed field in Booking
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleUsed", // <-- use vehicleUsed from Booking
          foreignField: "_id",
          as: "vehicle",
        },
      },
      {
        $unwind: {
          path: "$vehicle",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Final fields to include
      {
        $project: {
          bookingId: 1,
          pickup: 1,
          dropOff: 1,
          pickuptime: 1,
          pickupDate: 1,
          pickupTimeFormatted: 1,
          pickupMonth: 1,
          pickupWeek: 1,
          dropdownDate: 1,
          dropdownTime: 1,
          wating_time: 1,
          wating_time_formated: 1,
          distance: 1,
          totalFare: 1,
          paymentStatus: 1,
          status: 1,
          "driver.drivername": 1,
          "vehicle.company": 1,
          "vehicle.vehicleModel": 1,
          // "vehicle.licensePlate": 1,
        },
      },

      // Deduplicate
      {
        $group: {
          _id: "$bookingId",
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$doc",
        },
      },
    ]);

    // Sort bookings by pickupDate (desc)
    bookings.sort((a: any, b: any) => {
      // Combine pickupDate and pickuptime for full datetime comparison
      const getDateTime = (booking: any) => {
        // If pickuptime is present, combine with pickupDate
        if (booking.pickupDate && booking.pickuptime) {
          // Try to parse as ISO if possible, else fallback
          const dateStr = `${booking.pickupDate} ${booking.pickuptime}`;
          const dateTime = new Date(dateStr);
          if (!isNaN(dateTime.getTime())) return dateTime;
        }
        // Fallback: just use pickupDate
        return new Date(booking.pickupDate);
      };
      const dateA = getDateTime(a);
      const dateB = getDateTime(b);
      return dateB.getTime() - dateA.getTime();
    });

    if (!bookings || bookings.length === 0) {
      res.status(404).json({ message: "No bookings found!" });
      return;
    }

    res.status(200).json({
      message: "Bookings fetched successfully",
      bookings,
      total: bookings.length,
    });
    return;
  } catch (error) {
    console.error("Error fetching bookings: ", error);
    res.status(500).json({ message: "Error fetching the bookings" });
    return;
  }
};


export const getBookingdeteailsone = async (req: Request, res: Response) => {

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  try {
    const result = await BookingModels.aggregate([
      { $group: { _id: "$bookingId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },

      { $lookup: { from: "drivers", localField: "driver", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },

      { $lookup: { from: "vehicles", localField: "vehicleUsed", foreignField: "_id", as: "vehicle" } },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },

      { $sort: { pickupDate: -1, pickuptime: -1 } },

      {
        $facet: {
          totalCount: [{ $count: "count" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {  $project: {
              bookingId: 1,
              pickup: 1,
              dropOff: 1,
              pickuptime: 1,
              pickupDate: 1,
              pickupTimeFormatted: 1,
              pickupMonth: 1,
              pickupWeek: 1,
              dropdownDate: 1,
              dropdownTime: 1,
              wating_time: 1,
              wating_time_formated: 1,
              distance: 1,
              totalFare: 1,
              paymentStatus: 1,
              status: 1,
              "driver.drivername": 1,
              "vehicle.company": 1,
              "vehicle.vehicleModel": 1,
              // "vehicle.licensePlate": 1,
             } }
          ]
        }
      }
    ], { allowDiskUse: true });

    const total = result[0]?.totalCount[0]?.count || 0;
    const bookings = result[0]?.data || [];

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && totalPages > 0) {
      res.status(400).json({
        message: "Requested page exceeds total pages.",
        total,
        page,
        limit,
        totalPages,
        hasMore: false
      });
      return;
    }

    if (!bookings || bookings.length === 0) {
      res.status(404).json({
        message: "No bookings found!",  
        total,
        page,
        limit,
        totalPages,
        hasMore: false
      });
      return;
    }

    console.log("Bookings ====> ", bookings)

    res.status(200).json({
      message: "Bookings fetched successfully",
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + bookings.length < total
    });
    return;
  } catch (error) {
    console.error("Error fetching bookings: ", error);
    res.status(500).json({ message: "Error fetching the bookings" });
    return;
  }
};




export const setting = async (req: Request, res: Response) => {
  console.log("Received body:", req.body);

  const validationResult = SettingSchema.safeParse(req.body);

  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.errors });
    return;
  }

  const { base_price, km_price, waiting_time_price_per_minutes } = validationResult.data;

  try {
    let settings = await SettingSchemaModel.findOne();

    if (settings) {
      settings.base_price = base_price;
      settings.km_price = km_price;
      settings.waiting_time_price_per_minutes = waiting_time_price_per_minutes;
      await settings.save();
    } else {
      settings = new SettingSchemaModel({
        base_price,
        km_price,
        waiting_time_price_per_minutes,
      });
      await settings.save();
    }

    res.status(200).json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      message: "Something went wrong!",
      error: error.message,
    });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const validationResult = SettingSchema.safeParse(req.body);

  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.errors });
    return;
  }
  const { base_price, km_price, waiting_time_price_per_minutes } = validationResult.data;

  if (!base_price || !km_price || !waiting_time_price_per_minutes) {
    res.status(400).json({ message: "Both base basePrice and pricePerkm is required!" });
    return;
  }

  try {
    // Assuming you only keep one settings document
    const updatedSetting = await SettingSchemaModel.findOneAndUpdate(
      {}, // match condition — empty if only one doc
      {
        base_price,
        km_price,
        waiting_time_price_per_minutes,
      },
      { new: true, upsert: true } // upsert: create if not exists
    );

    res.status(200).json({
      message: "Settings updated successfully",
      setting: updatedSetting,
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

export const getsetting = async (req: Request, res: Response) => {

  try {
    const settings = await SettingSchemaModel.find();
    console.log("settings ------> ", settings)
    if (!settings) {
      res.status(404).json({ message: "Settings not found!!" });
      return;
    }

    res.status(200).json({ message: "Setting fetch Successfully", settings });
  }
  catch (error: any) {
    res.status(500).json({ message: "Something worng!!", error });
  }
}


export const getAllShifts = async (req: Request, res: Response) => {
  try {
    const shifts = await Shift.find()
      .populate({
        path: 'drivers',
        select: 'driverId drivername email phoneNumber status', // Select specific driver fields
        populate: {
          path: 'vehicle', // Populate vehicle details for each driver
          select: 'registrationNumber company vehicleModel year status' // Select specific vehicle fields
        }
      })
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({ json: "Successfully Fetch shifts ", shifts });
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

export const getAllShifts12 = async (req: Request, res: Response) => {
  try {
    const shifts = await Shift.aggregate([
      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "driverId",
          as: "driver"
        }
      },
      {
        $unwind: {
          path: "$driver",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          startTime: 1,
          startDate: 1,
          endTime: 1,
          endDate: 1,
          totalEarnings: 1,
          totalDuration: 1,
          totalDistance: 1,
          isActive: 1,
          "driver.drivername": 1,
          "driver.email": 1,
          "driver.status": 1,
          "driver.phoneNumber": 1
        }
      }
    ]);

    res.status(200).json({
      message: "Successfully fetched all shifts with driver info",
      shifts
    });
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

export const scheduleRide = async (req: Request, res: Response) => {

  // Destructure pickup and dropoff separately to avoid variable redeclaration
  const {
    customerName,
    customer_phone_number,
    pickupAddress,
    dropOffAddress,
    time,
    date
  } = req.body;

  // Validate required fields for pickup and dropoff
  if (
    !time ||
    !date
  ) {
    res.status(400).json({ message: "Time, and Date are required!" });
    return;
  }

  try {

    const scheduledRide = new ScheduleRide({
      customerName,
      customer_phone_number,
      pickuptime: time,
      pickupDate: date,
      pickupAddress,
      dropOffAddress,
      status: "schedule",
    });

    await scheduledRide.save();

    console.log("Date --> ", date);
    console.log("time ---> ", time);
    const dateTimeString = `${date} ${time}`;
    console.log("dateTimeString ---> ", dateTimeString);
    const rideDateTime = parse(dateTimeString, "MM/dd/yyyy hh:mma", new Date());
    console.log("ride date time ---> ", rideDateTime);


    if (isNaN(rideDateTime.getTime())) {
      console.error("Invalid ride date/time format.");
      res.status(400).json({ message: "Invalid date or time format." });
      return;
    }

    // Convert the rideDateTime (assumed to be in local/server time) to PDT
    const pdtTimeZone = 'America/Vancouver';
    const rideDateTimeInPDT = toZonedTime(rideDateTime, pdtTimeZone);

    // Subtract 10 minutes in PDT
    const notifyTimeInPDT = new Date(rideDateTimeInPDT.getTime() - 10 * 60 * 1000);

    // If you need to convert notifyTimeInPDT back to UTC for cron or storage:
    // const notifyTime = zonedTimeToUtc(notifyTimeInPDT, pdtTimeZone);

    // For cron, you likely want the PDT time:
    const notifyTime = notifyTimeInPDT;
    console.log("notifyTime ---> ", notifyTime);

    const getcronTime = getCronTime(notifyTime);
    console.log("getcronTime ---> ", getcronTime)

    await sendEmailMessage(date, time, customerName, customer_phone_number, pickupAddress, dropOffAddress);

    cron.schedule(getCronTime(notifyTime), async () => {
      console.log("enter is cron");
      try {
        // await sendWhatsappMessage(adminWhatsAppNumber, date, time, customerName, customer_phone_number, pickupAddress, dropOffAddress);
        await sendEmailMessageBeforeTime(date, time, customerName, customer_phone_number, pickupAddress, dropOffAddress);
        console.log("Message sent successfully!!");
      }
      catch (error) {
        console.log("Error Sending message!!");
      }
    })

    res.status(201).json({
      message: "Ride scheduled successfully!",
      scheduledRide,
    });
  } catch (error) {
    console.error("Error scheduling ride:", error);
    res.status(500).json({ message: "Something went wrong while scheduling the ride." });
  }
};

function getCronTime(date: Date) {
  const min = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;

  if ([min, hour, day, month].some((v) => isNaN(v))) {
    throw new Error("Invalid notifyTime for cron scheduling.");
  }

  return `${min} ${hour} ${day} ${month} *`;
}


export const getDriverWithAssignedVehicle = async (req: Request, res: Response) => {
  try {
    const shifts = await Shift.aggregate([
      {
        $lookup: {
          from: "drivers", // Should match the actual collection name
          localField: "driverId",
          foreignField: "_id",
          as: "driver"
        }
      },
      { $unwind: "$driver" },

      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleUsed",
          foreignField: "_id",
          as: "vehicle"
        }
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          driverId: 1,
          startDate: 1,
          startTime: 1,
          endDate: 1,
          endTime: 1,
          totalDuration: 1,
          totalTrips: 1,
          totalEarnings: 1,
          totalDistance: 1,
          isActive: 1,
          createdAt: 1,
          driver: {
            _id: "$driver._id",
            driverId: "$driver.driverId",
            drivername: "$driver.drivername",
            email: "$driver.email",
            phoneNumber: "$driver.phoneNumber"
          },
          vehicle: {
            _id: "$vehicle._id",
            registrationNumber: "$vehicle.registrationNumber",
            vehicleModel: "$vehicle.vehicleModel",
            vehicle_plate_number: "$vehicle.vehicle_plate_number",
            isAssigned: "$vehicle.isAssigned"
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.status(200).json({ shifts: shifts });
  } catch (error) {
    console.error("Error fetching shift assignments:", error);
    res.status(500).json({ success: false, message: "Error fetching shifts", error });
  }
};



export const stopshiftbyadmin = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const { endTime, endDate } = req.body;

  console.log("Endtime ---> ", endTime);
  console.log("EndDate ---> ", endDate);

  if (!endTime || !endDate) {
    res.status(400).json({ message: "endTime and endDate are required" });
    return;
  }


  if (!driverId) {
    res.status(400).json({ message: "DriverId is required!!" });
    return;
  }

  try {

    const driver = await Driver.findOne({ driverId });

    if (!driver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }

    const activeBooking = await BookingModels.findOne({
      driver: driver._id,
      status: { $in: "ongoing" }
    })

    if (activeBooking) {
      res.status(400).json({ message: "You cannot stop the shift while driver has an active ride in progress" });
      return;
    }

    const activeShift = await Shift.findOne({ driverId: driver._id, isActive: true });

    if (!activeShift) {
      res.status(400).json({ message: "No active shift found For the driver" })
      return;
    }
    // const endDatenow = endDate || new Date().toLocaleDateString('en-US', {
    //   month: '2-digit',
    //   day: '2-digit',
    //   year: 'numeric',
    //   timeZone: 'America/Vancouver', // ✅ IST
    // });
    // const endTimenow = endTime || new Date().toLocaleTimeString('en-US', {
    //   hour: 'numeric',
    //   minute: '2-digit',
    //   hour12: true,
    //   timeZone: 'America/Vancouver', // ✅ IST
    // });
    console.log(`${activeShift.startDate} ${activeShift.startTime}`);

    const start = parse(`${activeShift.startDate} ${activeShift.startTime}`, "MM/dd/yyyy hh:mma", new Date());
    console.log(`start ----- > ${start}`)
    const end = parse(`${endDate} ${endTime}`, "MM/dd/yyyy hh:mma", new Date());
    console.log(`end ----- > ${end}`)


    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: "Invalid date/time format" });
      return;
    }

    const durationMs = end.getTime() - start.getTime();
    console.log(`durationMs ----- > ${durationMs}`)

    if (durationMs < 0) {
      res.status(400).json({ message: "End time must be after start time" });
      return;
    }

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    activeShift.endTime = endTime;
    activeShift.endDate = endDate;
    activeShift.endTimeFormatted = end.toISOString();
    activeShift.endMonth = end.toLocaleString('default', { month: 'long' });
    activeShift.isActive = false;
    activeShift.totalDuration = `${hours}h ${minutes}m ${seconds}s`;
    activeShift.isStopedByAdmin = true;


    const vehicle = await Vehicle.findById(activeShift.vehicleUsed);
    console.log("vehicle --> ", vehicle)
    if (vehicle) {
      vehicle.isAssigned = false;
      await vehicle.save();
    }
    console.log("vehicle --> ", vehicle)

    await activeShift.save();
    await driver.save();
    res.status(200).json({
      message: "Shift ended successfully",
      shift: activeShift,
      shiftDuration: activeShift.totalDuration,
    });
  }
  catch (error) {
    res.status(500).json({ message: "Something went wrong!!", error });
  }
}


export const stopAllShift = async (req: Request, res: Response) => {
  try {

    const { endTime, endDate } = req.body;

    console.log("EndTime --> ", endTime);
    console.log("endDate --> ", endDate);
    // Find all active shifts
    const activeShifts = await Shift.find({ isActive: true });

    if (!activeShifts.length) {
      res.status(200).json({ message: "No active shifts to stop." });
      return;
    }

    // const activeBooking = await BookingModels.find({status:{$in: "ongoing"}});

    // if(activeBooking){
    //   res.status(400).json({message:"You cannot stop the shift while driver has an active ride in progress!"});
    //   return;
    // }

    // const now = new Date();
    const updates = [];

    for (const shift of activeShifts) {
      // Calculate duration
      const start = parse(`${shift.startDate} ${shift.startTime}`, "MM/dd/yyyy hh:mma", new Date());
      console.log("start -------> ", start);
      const end = parse(`${endDate} ${endTime}`, "MM/dd/yyyy hh:mma", new Date());
      console.log("end -------> ", end);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({ message: "Invalid date/time format" });
        return;
      }

      const durationMs = end.getTime() - start.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

      shift.endTime = endTime;
      // Format end date as MM/DD/YYYY (e.g., 07/02/2025)
      const month = String(end.getMonth() + 1).padStart(2, '0');
      const day = String(end.getDate()).padStart(2, '0');
      const year = end.getFullYear();
      shift.endDate = endDate;
      shift.endTimeFormatted = end.toISOString();
      shift.endMonth = end.toLocaleString('default', { month: 'long' });
      shift.isActive = false;
      shift.totalDuration = `${hours}h ${minutes}m ${seconds}s`;
      shift.isStopedByAdmin = true;

      // Unassign vehicle if assigned
      if (shift.vehicleUsed) {
        const vehicle = await Vehicle.findById(shift.vehicleUsed);
        if (vehicle) {
          vehicle.isAssigned = false;
          await vehicle.save();
        }
      }

      updates.push(shift.save());
      console.log("shifts ---> ", shift);
    }


    await Promise.all(updates);

    res.status(200).json({
      message: "✅ All active shifts have been stopped successfully.",
      stoppedShifts: activeShifts.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to stop all active shifts.", error });
  }
};