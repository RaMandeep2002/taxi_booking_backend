import { Request, Response } from "express";
import { Driver } from "../models/DriverModel";
import { Shift } from "../models/ShiftModel"
import BookingModels from "../models/BookingModels";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { SettingSchemaModel } from "../models/SettingModels";
import { Vehicle } from "../models/VehicleModel";
import { parse } from "date-fns";
// import { generateBookingId } from '../utils/generateId'; // You'll need to create this utility function


export const getDriverId = (token?: string): string | null => {
  if (!token) return null;

  try {
      const secret = process.env.JWT_SECRET || ""; // Ensure this is set in your .env file
      const decoded = jwt.verify(token, secret) as { id?: string };
      console.log(decoded);
      return decoded.id || null;
  } catch (error) {
      console.error("Invalid or expired token:", error);
      return null;
  }
};
export const updateDriverStatus = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const { status } = req.body;

  if (!["available", "busy", "not working"].includes(status)) {
    res.status(400).json({ message: "Invaild status value" });
    return;
  }
  try {
    const driver = await Driver.findOneAndUpdate(
      { driverId },
      { status },
      { new: true },
    );

    if (!driver) {
      res.status(404).json({ message: "Driver Not found!" });
      return;
    }

    res
      .status(200)
      .json({ message: "Driver status Update successfully", driver });
  } catch (error: any) {
    res.status(500).json({ message: "Error Updating Driver status", error });
  }
};

export const getAllVehicles = async (req: Request, res: Response) => {
  
  try {
    const vehicles = await Vehicle.find().select(
      "_id company vehicleModel year vehicle_plate_number status registrationNumber isAssigned"
    );


    if (!vehicles || vehicles.length === 0) {
       res.status(404).json({ message: "No vehicles assigned to driver" });
       return;
    }

    res.status(200).json({
      message: "Vehicles retrieved successfully",
      vehicles: vehicles
    });

  } catch (error) {
    console.error("Error retrieving driver vehicle:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// export const getAllVehicles = async (req: Request, res: Response) => {
//   try {
//     const vehicles = await Vehicle.find().select(
//       "_id company vehicleModel year status registrationNumber isShared"
//     );

//     if (!vehicles || vehicles.length === 0) {
//        res.status(404).json({ message: "No vehicles found" });
//        return;
//     }

//     res.status(200).json({
//       message: "All vehicles retrieved successfully",
//       vehicles,
//     });
//   } catch (error) {
//     console.error("Error fetching all vehicles:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

export const startShift = async (req: Request, res: Response) => {
  console.log("enter");
  const token = req.headers.authorization?.split(" ")[1];

  const driverId = getDriverId(token);
  const { vehicleUsed } = req.body;

  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver not found" });
      return;
    }
    if (!driver.vehicle.includes(vehicleUsed)) {
      res.status(400).json({ message: "Invalid vehicle" });
      return;
    }
    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });

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

    const shift = new Shift(newShift);
    await shift.save();
    driver.shifts.push(shift._id as any); // Type assertion to fix type error
    await driver.save();

    res.status(200).json({ message: "Shift started", shift: shift }); // Return saved shift object
  } catch (error) {
    res.status(500).json({ message: "Error starting shift", error });
  }
};
export const startShiftwithtime = async (req: Request, res: Response) => {
  console.log("enter");
  const token = req.headers.authorization?.split(" ")[1];

  const driverId = getDriverId(token);
  const { vehicleUsed, startTime, startDate } = req.body;

  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver not found" });
      return;
    }
    // if (!driver.vehicle.includes(vehicleUsed)) {
    //   res.status(400).json({ message: "Invalid vehicle" });
    //   return;
    // }
    const vehicle = await Vehicle.findById(vehicleUsed);

    if (!vehicle) {
       res.status(404).json({ message: "Vehicle not found" });
       return;
    }

    if (vehicle.isAssigned === true) {
       res.status(400).json({ message: "This vehicle is currently assigned and cannot be used to start a shift." });
       return;
    }


    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
    console.log("active shift ====> ", activeShift);
    if (activeShift) {
      res.status(400).json({ message: "A shift is already active" });
      return;
    }
    const shiftStartTime = startTime || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    console.log("shiftStartTime --------------> ", shiftStartTime)
    const shiftStartDate = startDate || new Date().toLocaleDateString();
    console.log("shiftStartDate --------------> ", shiftStartDate)
    
    const startTimeFormatted = `${shiftStartTime}, ${shiftStartDate}`;
    console.log("startTimeFormatted --------------> ", startTimeFormatted)
    const startMonth = new Date(shiftStartDate).toLocaleString('default', { month: 'long' });
    console.log("startMonth --------------> ", startMonth)
    const startWeek = Math.ceil(new Date(shiftStartDate).getDate() / 7);
    console.log("startWeek --------------> ", startWeek)
    
    const newShift = {
      driverId,
      // activeShift._id,
      startTime: shiftStartTime,
      startDate: shiftStartDate,
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

    vehicle.isAssigned = true;
    
    await vehicle.save()

    const shift = new Shift(newShift);
    await shift.save();
    driver.shifts.push(shift._id as any); // Type assertion to fix type error
    await driver.save();

    res.status(200).json({ message: "Shift started", shift: shift }); // Return saved shift object
  } catch (error) {
    res.status(500).json({ message: "Error starting shift", error });
  }
};


export const stopShift = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];

  const driverId = getDriverId(token);

  try {
    const driver = await Driver.findOne({ driverId }).populate("shifts");
    if (!driver) {
      res.status(404).json({ message: "Not active shift found!" });
      return;
    }

    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });

    if (!activeShift) {
      res.status(400).json({ message: "No active shift found!!" });
      return;
    }

    const endTimenow = new Date().toLocaleTimeString();
    
    // Calculate total shift duration
    const startTime = new Date(`1970-01-01 ${activeShift.startTime}`);
    console.log("activeShift.startTime ======> ", activeShift.startTime);
    console.log("startTime ==> ", startTime)
    const endTime = new Date(`1970-01-01 ${endTimenow}`);
    console.log("endTime ==>", endTime)
    const durationMs = endTime.getTime() - startTime.getTime();
    console.log("durationMs ==> ", durationMs)
    
    // Convert to hours and minutes
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    console.log("hours ====> ", hours)
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    console.log("minutes ====> ", minutes)
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    console.log("seconds ====> ", seconds)
    
    activeShift.endTime = endTimenow;
    activeShift.isActive = false;
    activeShift.totalDuration = `${hours}h ${minutes}m ${seconds}s`;

    const vehicle = await Vehicle.findById(activeShift.vehicleUsed);
    if (vehicle) {
      vehicle.isAssigned = false;
      await vehicle.save();
    }

    await activeShift.save();
    await driver.save();
    res.status(200).json({ 
      message: "Shift ended", 
      shift: activeShift,
      shiftDuration: activeShift.totalDuration 
    });
  } catch (error) {
    res.status(500).json({ message: "Error stopping shift", error });
  }
};



export const stopShiftwithtime = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  const driverId = getDriverId(token);

  const { endTime, endDate } = req.body;

  if (!endTime || !endDate) {
     res.status(400).json({ message: "endTime and endDate are required" });
     return;
  }

  try {
    const driver = await Driver.findOne({ driverId }).populate("shifts");
    if (!driver) {
       res.status(404).json({ message: "Driver not found!" });
       return;
    }

    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
    if (!activeShift) {
      res.status(400).json({ message: "No active shift found!!" });
      return;
    }

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

    // Unassign vehicle
    const vehicle = await Vehicle.findById(activeShift.vehicleUsed);
    if (vehicle) {
      vehicle.isAssigned = false;
      await vehicle.save();
    }

    await activeShift.save();
    await driver.save();

    res.status(200).json({
      message: "Shift ended successfully",
      shift: activeShift,
      shiftDuration: activeShift.totalDuration,
    });
    
  } catch (error) {
    res.status(500).json({ message: "Error stopping shift", error });
  }
};

export const cofirmRide = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const { bookingId } = req.body;

  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }

    const booking = await BookingModels.findOne({ bookingId });
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
    res.status(500).json({ message: "Error confirming Rider", error })
  }
}

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

export const cancelRide = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];

  const driverId = getDriverId(token);
  const { bookingId } = req.body;

  if (!driverId || !bookingId) {
    res.status(400).json({ message: "DriverId and bookingId is required!!" });
    return;
  }

  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }

    const booking = await BookingModels.findOne({ bookingId });
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
}


// commman endpoints for drivres

export const deteleallShiftsHistory = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  if (!driverId) {
    res.status(400).json({ message: "Driverid is required!" })
    return;
  }

  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Dirver not found!!" });
      return;
    }

    const shifts = await Shift.find({ driverId: driver.driverId });
    if (shifts.length === 0) {
      res.status(404).json({ message: "No Shifts found!!" });
      return;
    }

    // Delete shifts from driver schema
    driver.shifts = [];
    await driver.save();

    // Delete all shift documents
    await Shift.deleteMany({ driverId: driver.driverId });
    res.status(200).json({ message: "All shifts deleted succesfully", shifts });
  }
  catch (error) {
    res.status(500).json({ message: "Error deleting shifts", error });
    return;
  }
}

export const getBookingdeteails = async (req: Request, res: Response) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    res.status(400).json({ message: 'Not a vaild bookingId' });
  }

  try {
    const bookings = await BookingModels.findOne({ bookingId });
    console.log("Bookings ==> ", bookings);
  }
  catch (error) {
    res.status(500).json({ message: "Error to fetching the booking" });
  }
}




// new api endpoints

export const start_Ride = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  const driverId = getDriverId(token);
  console.log("driverID -----> ", driverId)
  const {
    customerName,
    phoneNumber,
    pickup: { latitude, longitude, address }
  } = req.body;

  // Validate required fields
  if (
    !driverId ||
    latitude === undefined ||
    longitude === undefined ||
    !address
  ) {
   res.status(400).json({
      message: "All fields are required: customerName, phoneNumber, and pickup location"
    });
    return;
  }

  try {
    // Find driver
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
       res.status(404).json({ message: "Driver not found!" });
       return;
    }

    console.log("driver ------> ",driver);

    // Find shift
    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
    if (!activeShift) {
       res.status(400).json({ message: "No active shift found" });
       return;
    }

    console.log("activeShift ------> ", activeShift)

    const now = new Date();

    // Generate booking ID
    const bookingId = generateBookingId();

    // Create new booking instance
    const bookingDoc ={
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
      pickuptime:new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Vancouver', // ✅ IST
      }),
      pickupDate: new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'America/Vancouver', // ✅ IST
      }),
      pickupTimeFormatted: now.toISOString(),
      pickupMonth: now.toLocaleString('default', { month: 'long' }),
      pickupWeek: Math.ceil(now.getDate() / 7),
      driver: driver._id,
      status: "ongoing",
      arrived: true,
      paymentStatus: "pending",
      paymentMethod: "cash"
    };

    const booking = new BookingModels(bookingDoc);
    await booking.save();
    console.log("booking ===>", booking)

    const getbooking = await BookingModels.findOne({bookingId});
    console.log("getbooking ===>", getbooking)
    if(!getbooking){  
      res.status(404).json({message:"no booking found!"});
      return;
    }
    // Update shift
    activeShift.totalTrips += 1;
    activeShift.bookings.push(booking._id as any); // 👈 Add booking to shift

    // Update driver
    driver.status = "busy";

    // Save updates
    await Promise.all([
      activeShift.save(), // 👈 Will now store the booking inside shift
      driver.save()
    ]);

    res.status(200).json({
      message: "Ride started successfully",
      booking: bookingDoc
    });
    return;
  } catch (error: any) {
    console.error("Ride start error:", error);
     res.status(500).json({
      message: "Error starting the ride",
      error: error.message || error
    });
    return;
  }
};

export const start_Ride_with_pickuptime = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  const driverId = getDriverId(token);
  console.log("driverID -----> ", driverId)
  const {
    customerName,
    phoneNumber,
    pickuptime,
    pickupDate,
    pickup: { latitude, longitude, address }
  } = req.body;

  // Validate required fields

  // const shiftStartTime = startTime || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  if (
    !driverId ||
    latitude === undefined ||
    longitude === undefined ||
    !address
  ) {
   res.status(400).json({
      message: "All fields are required: customerName, phoneNumber, and pickup location"
    });
    return;
  }

  try {
    // Find driver
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
       res.status(404).json({ message: "Driver not found!" });
       return;
    }

    console.log("driver ------> ",driver);

    // Find shift
    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
    if (!activeShift) {
       res.status(400).json({ message: "No active shift found" });
       return;
    }

    console.log("activeShift ------> ", activeShift)

    const now = new Date();

    // Generate booking ID
    const bookingId = generateBookingId();

    // Create new booking instance
    const bookingDoc ={
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
      pickuptime:pickuptime || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      pickupDate:pickupDate|| new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'}),
      pickupTimeFormatted: now.toISOString(),
      pickupMonth: now.toLocaleString('default', { month: 'long' }),
      pickupWeek: Math.ceil(now.getDate() / 7),
      driver: driver._id,
      status: "ongoing",
      arrived: true,
      paymentStatus: "pending",
      paymentMethod: "cash"
    };

    const booking = new BookingModels(bookingDoc);
    await booking.save();
    console.log("booking ===>", booking)

    const getbooking = await BookingModels.findOne({bookingId});
    console.log("getbooking ===>", getbooking)
    if(!getbooking){  
      res.status(404).json({message:"no booking found!"});
      return;
    }
    // Update shift
    activeShift.totalTrips += 1;
    activeShift.bookings.push(booking._id as any); // 👈 Add booking to shift

    // Update driver
    driver.status = "busy";

    // Save updates
    await Promise.all([
      activeShift.save(), // 👈 Will now store the booking inside shift
      driver.save()
    ]);

    res.status(200).json({
      message: "Ride started successfully",
      booking: bookingDoc
    });
    return;
  } catch (error: any) {
    console.error("Ride start error:", error);
     res.status(500).json({
      message: "Error starting the ride",
      error: error.message || error
    });
    return;
  }
};


// Utility function to generate booking ID (create in separate file)
function generateBookingId(): string {
  const prefix = 'BK';
  console.log('prefix:', prefix);
  const timestamp = Date.now().toString().slice(-6);
  console.log('timestamp:', timestamp);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  console.log('random:', random);
  return `${prefix}${timestamp}${random}`;
}

export const end_Ride = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];

  const driverId = getDriverId(token);
  console.log("driver Id ----> ", driverId)
  // waiting time 
  console.log(req.body);
  const { bookingId, distance, wating_time, discount_price, dropOff } = req.body;


  if (
    !driverId || 
    !bookingId || 
    distance === undefined || 
    wating_time === undefined || 
    dropOff?.latitude === undefined|| 
    dropOff?.longitude === undefined|| 
    !dropOff?.address
  ) {
     res.status(400).json({ message: "driverId, bookingId and drop-off location are required" });
     return;
  }
  
  const { latitude: dropLatitude, longitude: dropLongitude, address: dropAddress } = dropOff;
  

  const waiting_time_formated = secondsToHHMMSS(wating_time);

  try {
    const settings = await SettingSchemaModel.findOne();
    if(!settings){
      res.status(404).json({message:"No setting found!!"});
      return;
    }
    console.log("settings ----> ", settings);
    const FLAG_PRICE = settings.base_price;
    const DISTANCE_PRICE_PER_KM = settings.km_price;
    const WAITING_TIME_RATE_PER_MIN = settings.waiting_time_price_per_minutes;

    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }

    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
    if (!activeShift) {
      res.status(400).json({ message: "no active shift found" });
      return;
    }

    const booking = await BookingModels.findOne({ bookingId });
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

    // const time = new Date();
    const { original, final: totalFare } = await CalculateTaxiTotalFarePrice(FLAG_PRICE,DISTANCE_PRICE_PER_KM,WAITING_TIME_RATE_PER_MIN, distance, wating_time);

    const discounted_price_calaute = totalFare - discount_price;

    activeShift.totalEarnings += booking.totalFare; // Assuming fareAmount is the earnings for this trip
    activeShift.totalDistance += activeShift.distance; // Assuming distance is stored in the booking

    booking.status = "completed";
    booking.paymentStatus = "paid";
    driver.status = "available";
    booking.distance += distance;
    booking.totalFare += totalFare;
    booking.original_Fare_before_round += original;
    booking.discount_price += discount_price;
    booking.after_discount_price += discounted_price_calaute;
    booking.wating_time += wating_time;
    booking.wating_time_formated = waiting_time_formated;
    booking.dropdownTime=new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Vancouver', // ✅ IST
    }),
    booking.dropdownDate= new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'America/Vancouver', // ✅ IST
    }),
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
}

export const end_Ride_with_dropTime = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];

  const driverId = getDriverId(token);
  console.log("driver Id ----> ", driverId)
  // waiting time 
  console.log(req.body);
  const { bookingId, distance, wating_time, discount_price,dropdownDate,dropdownTime, dropOff } = req.body;

  if (
    !driverId || 
    !bookingId || 
    distance === undefined || 
    wating_time === undefined || 
    dropOff?.latitude === undefined|| 
    dropOff?.longitude === undefined|| 
    !dropOff?.address
  ) {
     res.status(400).json({ message: "driverId, bookingId and drop-off location are required" });
     return;
  }
  
  const { latitude: dropLatitude, longitude: dropLongitude, address: dropAddress } = dropOff;
  

  try {
    const settings = await SettingSchemaModel.findOne();
    if(!settings){
      res.status(404).json({message:"No setting found!!"});
      return;
    }

    const FLAG_PRICE = settings.base_price;
    const DISTANCE_PRICE_PER_KM = settings.km_price;
    const WAITING_TIME_RATE_PER_MIN = settings.waiting_time_price_per_minutes;

    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }

    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
    if (!activeShift) {
      res.status(400).json({ message: "no active shift found" });
      return;
    }

    const booking = await BookingModels.findOne({ bookingId });
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

    // const time = new Date();
    const { original, final: totalFare } = await CalculateTaxiTotalFarePrice(FLAG_PRICE,DISTANCE_PRICE_PER_KM,WAITING_TIME_RATE_PER_MIN, distance, wating_time);

    const discounted_price_calaute = totalFare - discount_price;

    activeShift.totalEarnings += booking.fareAmount; // Assuming fareAmount is the earnings for this trip
    activeShift.totalDistance += activeShift.distance; // Assuming distance is stored in the booking

    booking.status = "completed";
    booking.paymentStatus = "paid";
    driver.status = "available";
    booking.distance += distance;
    booking.totalFare += totalFare;
    booking.original_Fare_before_round += original;
    booking.discount_price += discount_price;
    booking.after_discount_price += discounted_price_calaute;
    booking.wating_time += wating_time;
    booking.dropdownDate = dropdownDate ||  new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});
    booking.dropdownTime = dropdownTime || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
}


function CalculateTaxiTotalFarePrice(flag_price: number, distance_price_per_meter: number, waiting_time_price_per_seconds: number, distance: number, waitingTimeMin: number): { original: number, final: number } {
  const distanceFare = distance * distance_price_per_meter;

  console.log("distanceFare ---------> ", distanceFare)

  const waitingTimeFare = waitingTimeMin * waiting_time_price_per_seconds / 60;

  console.log("waitingTimeFare ---------> ", waitingTimeFare)

  const totalfare = flag_price + distanceFare + waitingTimeFare;

  console.log("totalFare ---------> ", totalfare)

  const totalfareAfterparas = parseFloat(totalfare.toFixed(2));
  console.log("totalfareAfterparas ===> ", totalfareAfterparas)

  const parts = totalfareAfterparas.toFixed(2).split(".");
  console.log("parts ===> ", parts)

  const beforeDecimal = parts[0];
  console.log("beforeDecimal ===> ", beforeDecimal)
  const decimal = parts[1]; // like "58"
  console.log("decimal ===> ", decimal)

  const firstDigit = decimal[0];
  console.log("firstDigit ===> ", firstDigit)
  const lastDigit = parseInt(decimal[1]);
  console.log("lastDigit ===> ", lastDigit)

  const newLastDigit = lastDigit % 5 === 0 ? lastDigit : lastDigit + (5 - (lastDigit % 5));
  console.log("newLastDigit ===> ", newLastDigit)
  const newDecimal = `${firstDigit}${newLastDigit === 10 ? '0' : newLastDigit}`;
  console.log("newDecimal ===> ", newDecimal)

  let roundedValue = parseFloat(`${beforeDecimal}.${newDecimal}`);
  console.log("roundedValue ===> ", roundedValue)

  // handle edge case when newLastDigit is 10
  if (newLastDigit === 10) {
      roundedValue += 0.1;
  }

  const totalFare =  parseFloat(roundedValue.toFixed(2));

  return {
    original: totalfareAfterparas,
    final: totalFare,
  };
}

// function parseTimeToMinutes(timeStr: string): number {
//   if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) {
//     return 0; // fallback to 0 if input is invalid
//   }
//   const [minutesStr, secondsStr] = timeStr.split(":");
//   const minutes = parseInt(minutesStr, 10);
//   console.log("minutes ----> ", minutes);
//   const seconds = parseInt(secondsStr, 10);
//   console.log("seconds ----> ", seconds);
//   const totalMinutes = minutes + seconds / 60;
//   return parseFloat(totalMinutes.toFixed(2)); // optional: limit to 2 decimals
// }


export const CalculateTotalFareApi = async(req:Request, res:Response) =>{
  const {distance, waiting_time_price_per_minutes} = req.body;

  if(!distance || !waiting_time_price_per_minutes){
    res.status(400).json("distance and waiting time require!!");
    return;
  }

  try{
    const settings = await SettingSchemaModel.findOne();
    if(!settings){
      res.status(404).json({message:"No setting found!!"});
      return;
    }

    const BASE_PRICE = settings.base_price;
    console.log("BASE_PRICE ---> ", BASE_PRICE)
    const DISTANCE_PRICE_PER_KM = settings.km_price;
    console.log("DISTANCE_PRICE_PER_KM ---> ", DISTANCE_PRICE_PER_KM)
    const WAITING_TIME_RATE_PER_MIN = settings.waiting_time_price_per_minutes;
    console.log("WAITING_TIME_RATE_PER_MIN ---> ", WAITING_TIME_RATE_PER_MIN)


    const { original, final: totalFare } = await CalculateTaxiTotalFarePrice12(BASE_PRICE,DISTANCE_PRICE_PER_KM,WAITING_TIME_RATE_PER_MIN, distance, waiting_time_price_per_minutes);

    res.status(200).json({message:"Prices ---> ", original, totalFare });
    return;
  }
  catch(error){
    res.status(500).json({message:"Problem in calcuate the price!!"});
    return;
  }
}



function CalculateTaxiTotalFarePrice12(flag_price: number, distance_price_per_meter: number, waiting_time_price_per_seconds: number, distance: number, waitingTimeMin: number): { original: number, final: number } {
  const distanceFare = distance * distance_price_per_meter;

  console.log("distanceFare ---------> ", distanceFare)

  const waitingTimeFare = waitingTimeMin * waiting_time_price_per_seconds /60;

  console.log("waitingTimeFare ---------> ", waitingTimeFare)

  const totalfare = flag_price + distanceFare + waitingTimeFare;

  console.log("totalFare ---------> ", totalfare)

  const totalfareAfterparas = parseFloat(totalfare.toFixed(2));
  console.log("totalfareAfterparas ===> ", totalfareAfterparas)

  const parts = totalfareAfterparas.toFixed(2).split(".");
  console.log("parts ===> ", parts)

  const beforeDecimal = parts[0];
  console.log("beforeDecimal ===> ", beforeDecimal)
  const decimal = parts[1]; // like "58"
  console.log("decimal ===> ", decimal)

  const firstDigit = decimal[0];
  console.log("firstDigit ===> ", firstDigit)
  const lastDigit = parseInt(decimal[1]);
  console.log("lastDigit ===> ", lastDigit)

  const newLastDigit = lastDigit % 5 === 0 ? lastDigit : lastDigit + (5 - (lastDigit % 5));
  console.log("newLastDigit ===> ", newLastDigit)
  const newDecimal = `${firstDigit}${newLastDigit === 10 ? '0' : newLastDigit}`;
  console.log("newDecimal ===> ", newDecimal)

  let roundedValue = parseFloat(`${beforeDecimal}.${newDecimal}`);
  console.log("roundedValue ===> ", roundedValue)

  // handle edge case when newLastDigit is 10
  if (newLastDigit === 10) {
    roundedValue = parseFloat((roundedValue + 0.1).toFixed(2));
  }

  const totalfareAfterparasfloat =  parseFloat(roundedValue.toFixed(2));

  const totalFare = totalfareAfterparasfloat.toFixed(2);

  return {
    original: totalfareAfterparas,
    final: Number(totalFare),
  };
}



function secondsToHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num: number) => String(num).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}