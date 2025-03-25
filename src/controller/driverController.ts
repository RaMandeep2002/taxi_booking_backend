import { Request, Response } from "express";
import { Driver } from "../models/DriverModel";
import { Shift } from "../models/ShiftModel"
import BookingModels from "../models/BookingModels";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { SettingSchemaModel } from "../models/SettingModels";
// import { generateBookingId } from '../utils/generateId'; // You'll need to create this utility function

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

export const getTheDriverVechicle = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1]; // Get the token from the Authorization header

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  
  try {

     const secret = process.env.JWT_SECRET || "cypres"; // Use your secret key
    const decoded: any = jwt.verify(token, secret);
    console.log("decoded ====> ", decoded.id);
    const driverId = decoded.id;

    console.log("driverId ====> ", driverId);         
  
    if (!driverId) {
      res.status(400).json({ message: "DriverID not valild" });
      return;
    }
    const driver = await Driver.findOne({ driverId });
    console.log("Driver ===> ", driver);
    if (!driver) {
      res.status(404).json({ message: "Driver not found!!" });
      return;
    }

    const drivercar = await Driver.aggregate([
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
}

export const startShift = async (req: Request, res: Response) => {
  const { driverId } = req.params;
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


export const stopShift = async (req: Request, res: Response) => {
  const { driverId } = req.params;

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

export const startRide = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const { bookingId } = req.body;

  if (!driverId || !bookingId) {
    res.status(400).json({ message: "driverId and bookingId are requried" })
    return;
  }

  try {
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

    if (booking.status !== "accepted") {
      res.status(400).json({ message: "Booking is not accepted" });
      return;
    }

    if (driver.status !== "available") {
      res.status(400).json({ message: "Driver is not available" });
      return;
    }

    const pickupDate = new Date();

    activeShift.totalTrips += 1;0

    // booking.arrived = new Date().toISOString();
    booking.arrived = true;
    booking.status = "ongoing";
    booking.driver = driver._id as Types.ObjectId;
    driver.status = "busy";


    await activeShift.save();
    await booking.save();
    await driver.save();
    res.status(200).json({ message: "Ride started successfully", booking });
  }
  catch (error) {
    res.status(500).json({ message: "Error starting the ride", error });
  }
}

export const endRide = async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const { bookingId, distance } = req.body;

  if (!driverId || !bookingId) {
    res.status(400).json({ message: "driverId and bookingId in not valid" });
    return;
  }

  try {
    const settings = await SettingSchemaModel.findOne();
    if(!settings){
      res.status(404).json({message:"No settting found!!"});
      return;
    }

    const BASE_FARE_PRICE = settings.basePrice;


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
      res.status(400).json({ message: "Driver in not busy" });
      return;
    }

    const totalFare = BASE_FARE_PRICE * distance;
    const time = new Date();

    activeShift.totalEarnings += booking.fareAmount; // Assuming fareAmount is the earnings for this trip
    activeShift.totalDistance += activeShift.distance; // Assuming distance is stored in the booking


    booking.status = "completed";
    driver.status = "available";
    booking.distance += distance;
    booking.totalFare += totalFare;
    booking.dropdownDate = time.toISOString().split("T")[0];
    booking.dropdownTime = time.toISOString();

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

export const cancelRide = async (req: Request, res: Response) => {
  const { driverId } = req.params;
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
  const { driverId } = req.params;
  const { 
    customerName,
    phoneNumber,
    pickup: { latitude, longitude, address },
    dropOff: { 
      latitude: dropLatitude, 
      longitude: dropLongitude, 
      address: dropAddress 
    }
  } = req.body;

  // Validate required fields
  if (!driverId || !customerName || !phoneNumber || 
      !latitude || !longitude || !address ||
      !dropLatitude || !dropLongitude || !dropAddress) {
     res.status(400).json({ 
      message: "All fields are required: customerName, phoneNumber, pickup location, and drop-off location" 
    });
    return;
  }

  try {
    // Check if driver exists
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
       res.status(404).json({ message: "Driver not found!" });
       return;
    }

    // Check for active shift
    const activeShift = await Shift.findOne({ driverId: driver.driverId, isActive: true });
    if (!activeShift) {
      res.status(400).json({ message: "No active shift found" });
      return;
    }

    // Generate booking ID (you'll need to implement this function)
    const bookingId = generateBookingId();

    // Create new booking
    const newBooking = new BookingModels({
      bookingId,
      customerName,
      phoneNumber,
      pickup: {
        latitude,
        longitude,
        address
      },
      dropOff: {
        latitude: dropLatitude,
        longitude: dropLongitude,
        address: dropAddress
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
  const { driverId } = req.params;
  const { bookingId, distance } = req.body;

  if (!driverId || !bookingId) {
    res.status(400).json({ message: "driverId and bookingId in not valid" });
    return;
  }

  try {
    const settings = await SettingSchemaModel.findOne();
    if(!settings){
      res.status(404).json({message:"No settting found!!"});
      return;
    }

    const BASE_FARE_PRICE = settings.basePrice;


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
      res.status(400).json({ message: "Driver in not busy" });
      return;
    }

    const totalFare = BASE_FARE_PRICE * distance;
    const time = new Date();

    activeShift.totalEarnings += booking.fareAmount; // Assuming fareAmount is the earnings for this trip
    activeShift.totalDistance += activeShift.distance; // Assuming distance is stored in the booking


    booking.status = "completed";
    driver.status = "available";
    booking.distance += distance;
    booking.totalFare += totalFare;
    booking.dropdownDate = time.toISOString().split("T")[0];
    booking.dropdownTime = time.toISOString();

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
