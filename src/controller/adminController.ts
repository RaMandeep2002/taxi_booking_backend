import { Request, Response } from "express";
import User from "../models/User";
import { Vehicle } from "../models/VehicleModel";
import { Driver } from "../models/DriverModel";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import BookingModels from "../models/BookingModels";
import mongoose from "mongoose";
import { AuthRequest } from "../types/custom";
import { Roles } from "../types/roles";
import redisClinet from "../config/redis";
import fs from "fs";
import { format } from "fast-csv";
import { DriverAddSchema, registerSharedVehicleSchema, registerVehicleSchema, updateDriverAddSchema, updateVehicleSchema } from "../schema/DriverSchema";
import { SettingSchemaModel } from "../models/SettingModels";
import { SettingSchema } from "../schema/SettingSchema";
import { Shift } from "../models/ShiftModel";

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
    const drivers = await Driver.find().lean(); // Using lean() for faster query
    
    res.status(200).json({
      success: true,
      message: "Drivers fetched successfully",
      data: drivers,
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
  const { drivername, email, phoneNumber, driversLicenseNumber } = validationResult.data;

  try {
    const originalDriver = await Driver.findOne({ driverId });
    if (!originalDriver) {
      res.status(404).json({ message: "Driver not found!" });
      return;
    }

    const oldEmail = originalDriver.email;

    const updatedDriver = await Driver.findOneAndUpdate(
      { driverId },
      { $set: { drivername, email, phoneNumber, driversLicenseNumber } },
      { new: true }
    );
    console.log("Updated Driver --------> ", updatedDriver);

    await User.findOneAndUpdate(
      {email:oldEmail},
      {$set:{name:drivername, email}}
    );

    res
      .status(200)
      .json({ message: "Driver update successfully", updatedDriver });
  } catch (error: any) {
    res.status(500).json({ message: "Error Updating Driver", error });
  }
};
export const deleteDriver = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  if(!driverId){
    res.status(400).json({message:"DriverId is Invaild!!"});
    return;
  }

  try {
    const originalDriver = await Driver.findOne({driverId});
    console.log("originalDriver -----> ", originalDriver);
    if(!originalDriver){
      res.status(404).json({message:"Driver not found!!"});
      return;
    }

    const emailwhichtobedeleted = originalDriver.email;
    console.log("emailwhichtobedeleted  -----> ", emailwhichtobedeleted );

    const deleteDriver = await Driver.findOneAndDelete({ driverId });
    console.log("deleteDriver  -----> ", deleteDriver );

    if (!deleteDriver) {
      res.status(404).json({ message: "Driver not found" });
      return;
    }

    await User.findOneAndDelete({email: emailwhichtobedeleted});

    res.status(200).json({ message: "Driver Deleted Successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting driver", error });
  }
};


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

  const { company, vehicleModel, year,vehicle_plate_number, status } = validationResult.data;

  try {
    const { registrationNumber } = generateRandomRegistrationNumber();

    const newVehicle = new Vehicle({
      registrationNumber,
      company,
      vehicleModel,
      year,
      vehicle_plate_number,
      status: status || "available", // Mark it as available for all
      isShared: true, // optional flag to indicate shared vehicle
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

    res
      .status(200)
      .json({ message: "Successfully updateed!!", vechicle: updateDriver });
  } catch (error) {
    res.status(400).json({ message: "Error Updating Vehicle", error });
  }
};
export const removeVehicle = async (req: Request, res: Response) => {
  const { registrationNumber } = req.params;


  if(!registrationNumber){
    res.status(400).json({message:"DriverId is Invaild!!"});
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
    const { fromDate, toDate, pickup, drivername, company } = req.query;

    const matchStage: any = {};
    console.log("matchStage ------> ",matchStage)
    if (fromDate && toDate) {
      matchStage.pickupDate = {
        $gte: new Date(fromDate as string),
        $lte: new Date(toDate as string),
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
          localField: "driver.vehicle",
          foreignField: "_id",
          as: "driver.vehicles"
        }
      },
      { $unwind: { path: "$driver.vehicles", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...(drivername ? { "driver.drivername": { $regex: drivername, $options: "i" } } : {}),
          ...(company ? { "driver.vehicles.vehicle_plate_number": { $regex: company, $options: "i" } } : {}),
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
          "driver.vehicles.company": 1,
          "driver.vehicles.vehicleModel": 1,
          "driver.vehicles.year": 1,
          "driver.vehicles.vehicle_plate_number":1,
        },
      },
    ]);

    console.log("bookings ===> ", bookings)

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
        Booking_ID: booking.bookingId,
        PICKUP_DATE: booking.pickupDate,
        PICKUP_TIME: booking.pickuptime,
        PICKUP_MONTH: booking.pickupMonth,
        PICKUP_WEEK: booking.pickupWeek,
        ARRIVED: booking.arrived,
        CONTACT: booking.driver.phoneNumber,
        FINISH_DATE: booking.dropdownDate,
        FINISH_TIME: booking.dropdownTime,
        CUSTOMER_PHONE: booking.phoneNumber,
        ADDRESS: booking.pickup?.address || "N/A",
        VEHICLE: booking.driver.vehicles?.company || "N/A",
        VEHICLE_Number: booking.driver.vehicles?.vehicle_plate_number || "N/A",
        METER:booking.distance,
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
// export const gettingReport = async (req: Request, res: Response) => {
//   try {
//     const bookings = await BookingModels.aggregate([
//       {
//         $lookup: {
//           from: "drivers",
//           localField: "driver",
//           foreignField: "_id",
//           as: "driver",
//         },
//       },
//       { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: "vehicles",
//           localField: "driver.vehicle",
//           foreignField: "_id",
//           as: "driver.vehicles"
//         }
//       },
//       { $unwind: { path: "$driver.vehicles", preserveNullAndEmptyArrays: true } },
//       {
//         $project: {
//           bookingId: 1,
//           customerName: 1,
//           phoneNumber: 1,
//           pickup: 1,
//           dropOff: 1,
//           pickuptime: 1,
//           pickupDate: 1,
//           pickupTimeFormatted: 1,
//           pickupMonth: 1,
//           pickupWeek: 1,
//           dropdownDate: 1,
//           dropdownTime: 1,
//           arrived: 1,
//           distance: 1,
//           totalFare: 1,
//           paymentStatus: 1,
//           status: 1,
//           // Driver details
//           "driver.driverId": 1,
//           "driver.drivername": 1,
//           "driver.email": 1,
//           "driver.phoneNumber": 1,
//           "driver.status": 1,
//           "driver.isOnline": 1,
//           // Vehicle details
//           "driver.vehicles._id": 1,
//           "driver.vehicles.registrationNumber": 1,
//           "driver.vehicles.company": 1,
//           "driver.vehicles.vehicleModel": 1,
//           "driver.vehicles.year": 1,
//           "driver.vehicles.vehicle_plate_number":1,
//         },
//       },
//     ]);

//     console.log("bookings ===> ", bookings)

//     if (!bookings.length) {
//       res.status(404).json({ message: "No bookings found" });
//       return;
//     }

//     const filepath = "bookings.csv";
//     const writeableStream = fs.createWriteStream(filepath);
//     const csvStream = format({ headers: true });

//     csvStream.pipe(writeableStream);

//     bookings.forEach((booking) => {
//       csvStream.write({
//         Booking_ID: booking.bookingId,
//         PICKUP_DATE: booking.pickupDate,
//         PICKUP_TIME: booking.pickuptime,
//         PICKUP_MONTH: booking.pickupMonth,
//         PICKUP_WEEK: booking.pickupWeek,
//         ARRIVED: booking.arrived,
//         CONTACT: booking.driver.phoneNumber,
//         FINISH_DATE: booking.dropdownDate,
//         FINISH_TIME: booking.dropdownTime,
//         CUSTOMER_PHONE: booking.phoneNumber,
//         ADDRESS: booking.pickup?.address || "N/A",
//         VEHICLE: booking.driver.vehicles?.company || "N/A",
//         VEHICLE_Number: booking.driver.vehicles?.vehicle_plate_number || "N/A",
//         METER:booking.distance,
//       });
//     });

//     csvStream.end();

//     writeableStream.on("finish", () => {
//       res.download(filepath, "bookings.csv", (err) => {
//         if (err) {
//           console.error("Error sending file:", err);
//           res.status(500).json({ message: "Error generating CSV file." });
//         }
//         fs.unlinkSync(filepath);
//       });
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };





export const getBookingdeteails = async (req: Request, res: Response) => {

  try {
    // console.log("enter ================>");
    // console.log("Booking Id ===> ", bookingId);
    const bookings = await BookingModels.aggregate([
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
          bookingId:1,
          pickup: 1,
          dropOff: 1,
          pickuptime: 1,
          pickupDate: 1,
          pickupTimeFormatted: 1,
          pickupMonth: 1,
          pickupWeek: 1,
          dropdownDate: 1,
          dropdownTime: 1,
          wating_time:1,
          distance: 1,
          totalFare: 1,
          paymentStatus: 1,
          status: 1,
          // Driver details
          "driver.drivername": 1,
          //vehicle details
          "driver.vehicles.company": 1,
          "driver.vehicles.vehicleModel": 1,
        },
      },
      {
        $sort: {
          pickupDate: -1, // Sort by pickup date descending (newest first)
          pickuptime: -1  // Then sort by pickup time descending
        }
      }
    ])


    if (!bookings || !bookings?.length) {
      res.status(404).json({ message: "no booking found!!" });
    }

    console.log("Bookings ==> ", bookings);


    res.status(200).json({ message: "Bookings data ===> ", bookings: bookings, total: bookings.length })
  }
  catch (error) {
    res.status(500).json({ message: "Error to fetching the booking" });
  }
}


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
