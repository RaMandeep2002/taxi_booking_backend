import { Request, Response } from "express";
import User from "../models/User";
import { Driver, IVehicle, Vehicle } from "../models/DriverModels";
import crypto, { Verify } from "crypto";
import bcrypt from "bcryptjs";
import BookingModels from "../models/BookingModels";
import mongoose from "mongoose";
import { AuthRequest } from "../types/custom";
import { Roles } from "../types/roles";
import redisClinet from "../config/redis";
import fs from "fs";
import { format } from "fast-csv";

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
  const { drivername, email, driversLicenseNumber, phoneNumber, password } =
    req.body;

  try {
    if (!driversLicenseNumber) {
      res.status(400).json({ message: "driversLicenseNumber is required!" });
      return;
    }
    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      res
        .status(400)
        .json({ message: "Driver eith this email already exists!" });
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
    const drivers = await Driver.find();

    res.status(200).json({
      success: true,
      messge: "Driver Fetch successfully",
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
  const { name, email, phoneNumber } = req.body;

  try {
    const updateDriver = await Driver.findOneAndUpdate(
      { driverId },
      { $set: { name, email, phoneNumber } },
      { new: true },
    );

    if (!updateDriver) {
      res.status(404).json({ message: "Driver not found" });
      return;
    }

    res
      .status(200)
      .json({ message: "Driver update successfully", updateDriver });
  } catch (error: any) {
    res.status(500).json({ message: "Error Updating Drvier", error });
  }
};
export const deleteDriver = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  try {
    const deleteDriver = await Driver.findOneAndDelete({ driverId });

    if (!deleteDriver) {
      res.status(404).json({ message: "Driver not found" });
      return;
    }

    res.status(200).json({ message: "Driver Deleted Successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting driver", error });
  }
};

export const registerVehicle = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const { make, vehicleModel, year, status } = req.body;

  try {
    if (!make || !vehicleModel || !year) {
      res.status(400).json({ message: "Make, model, and year are required!" });
      return;
    }

    const { registrationNumber } = generateRandomRegistrationNumber(); // Fix function name

    const driver = await Driver.findOne({
      _id: new mongoose.Types.ObjectId(driverId),
    }).populate("vehicle");
    console.log(driver);
    if (!driver) {
      res.status(404).json({ message: "Driver not found!" });
      return;
    }

    const newVehicle = new Vehicle({
      registrationNumber,
      make,
      vehicleModel,
      year,
      status: status || "active",
    });

    const savedVehicle = await newVehicle.save();

    // Ensure _id is of type ObjectId before pushing
    driver.vehicle.push(savedVehicle._id as mongoose.Types.ObjectId);
    await driver.save();

    // Populate the driver's vehicle data
    const updatedDriver = await Driver.findById(driverId).populate("vehicle");

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
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      res.status(400).json({ message: "Invalid driver ID!" });
      return;
    }

    // Find the driver and populate the vehicle details
    const driver = await Driver.findById(driverId).populate("vehicle").populate("shifts");

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

export const updateVehicleInfomation = async (req: Request, res: Response) => {
  const { driverId, registrationNumber } = req.params;
  const { make, vehicleModel, year, status } = req.body;

  try {
    const vehicle = await Vehicle.findOne({ registrationNumber });
    if (!vehicle) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }

    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver doest exist!!" });
      return;
    }

    const updateDriver = await Driver.findOneAndUpdate(
      { driverId, registrationNumber },
      { $set: { make, vehicleModel, year, status } },
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
  const { driverId } = req.params;
  const { registrationNumber } = req.body;

  try {
    const existingDriver = await Driver.findOne({ driverId });
    if (!existingDriver) {
      res.status(404).json({ message: "Driver doesn't exist for this id" });
      return;
    }

    const existingVehicle = await Vehicle.findOne({ registrationNumber });
    if (!existingVehicle) {
      res.status(404).json({ message: "Vehicle is not found" });
      return;
    }

    // Remove vehicle from driver's vehicle array
    await Driver.findOneAndUpdate(
      { driverId },
      { $unset: { vehicle: "" } }
    );

    // Delete the vehicle document
    const removedVehicle = await Vehicle.findOneAndDelete({
      registrationNumber,
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

export const gettingReport = async (req: Request, res: Response) => {
  try {
    const bookings = await BookingModels.aggregate([
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
    const writeableStream = fs.createWriteStream(filepath);
    const csvStream = format({ headers: true });

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
        fs.unlinkSync(filepath);
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};





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
        $lookup:{
          from:"vehicles",
          localField:"driver.vehicle",
          foreignField:"_id",
          as:"driver.vehicles"
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
          pickup:1,
          dropOff:1,
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
          "driver.vehicles._id":1,
          "driver.vehicles.registrationNumber":1,
          "driver.vehicles.make":1,
          "driver.vehicles.vehicleModel":1,
          "driver.vehicles.year":1,
        },
      },
    ])


    if (!bookings || !bookings?.length) {
      res.status(404).json({ message: "no booking found!!" });
    }

    console.log("Bookings ==> ", bookings);


    res.status(200).json({ message: "Bookings data ===> ", bookings: bookings, total:bookings.length })
  }
  catch (error) {
    res.status(500).json({ message: "Error to fetching the booking" });
  }
}
