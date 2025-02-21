import { Request, Response } from "express";
import { Driver, Shift } from "../models/DriverModels";
import BookingModels from "../models/BookingModels";
import { Types } from "mongoose";


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

    activeShift.endTime = new Date();
    activeShift.isActive = false;

    await activeShift.save();
    await driver.save();
    res.status(200).json({ message: "Shift ended", shift: activeShift });
  } catch (error) {
    res.status(500).json({ message: "Error stopping shift", error });
  }
};



export const cofirmRide = async (req: Request, res:Response) => {
  const {driverId} = req.params;
  const {bookingId} = req.body;

  try{
    const driver = await Driver.findOne({driverId});
    if(!driver){
      res.status(404).json({message:"Driver not found!!"});
      return;
    }

    const booking = await BookingModels.findOne({bookingId});
    if(!booking){
      res.status(404).json({message:"Booking not found!!"});
      return;
    }

    if(booking.status !== "pending"){
      res.status(400).json({message:"Booking is pending"});
      return;
    }

    if(driver.status !== "available"){
      res.status(400).json({message:"Driver is not available"});
      return;
    }

    booking.status = "accepted";
    await booking.save();

    res.status(200).json({message:"Ride confirmed successfully", booking});
  }
  catch(error){
    res.status(500).json({message:"Error confirming Rider", error})
  }
}

export const startRide = async (req:Request, res:Response) =>{
  const {driverId} = req.params;
  const {bookingId} = req.body;

  if(!driverId || !bookingId){
    res.status(400).json({message:"driverId and bookingId are requried"})
    return;
  }

  try{
    const driver = await Driver.findOne({driverId});
    if(!driver){
      res.status(404).json({message:"Driver not found!!"});
      return;
    }

    const activeShift = await Shift.findOne({driverId : driver.driverId, isActive : true});
    if(!activeShift){
      res.status(400).json({message:"no active shift found"});
      return;
    }

    const booking = await BookingModels.findOne({bookingId});

    if(!booking){
      res.status(404).json({message:"Booking not found!!"});
      return;
    }

    if(booking.status !== "accepted"){
      res.status(400).json({message:"Booking is not accepted"});
      return;
    } 

    if(driver.status !== "available"){
      res.status(400).json({message:"Driver is not available"});
      return;
    }

    const pickupDate = new Date();

    activeShift.totalTrips += 1;

    // booking.arrived = new Date().toISOString();
    booking.arrived = true;
    booking.status = "ongoing";
    booking.driver = driver._id as Types.ObjectId;
    driver.status = "busy"; 


    await activeShift.save();
    await booking.save();
    await driver.save();
    res.status(200).json({message:"Ride started successfully", booking});
  }
  catch(error){
    res.status(500).json({message:"Error starting the ride", error});
  }
}

export const endRide = async(req:Request, res: Response) =>{
  const {driverId} = req.params;
  const {bookingId, distance} = req.body;

  const BASE_FARE_PRICE = 10;

  if(!driverId || !bookingId){
    res.status(400).json({message:"driverId and bookingId in not valid"});
    return;
  }

  try{
    const driver = await Driver.findOne({driverId});
    if(!driver){
      res.status(404).json({message:"Driver not found!!"});
      return;
    }

    const activeShift = await Shift.findOne({driverId : driver.driverId, isActive : true});
    if(!activeShift){
      res.status(400).json({message:"no active shift found"});
      return;
    }

    const booking = await BookingModels.findOne({bookingId});
    if(!booking){
      res.status(404).json({message:"Booking not found!!"});
      return;
    }

    if(booking.status !== "ongoing"){
      res.status(400).json({message:"Booking is not ongoing"});
      return;
    } 

    if(driver.status !=="busy"){
      res.status(400).json({message:"Driver in not busy"});
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

    res.status(200).json({message:"Ride ended successfully", booking});
  }
  catch(error){
    res.status(500).json({message:"Error ending the ride", error});
  }
}
 
export const cancelRide = async(req: Request, res: Response) =>{
  const {driverId} = req.params;
  const {bookingId} = req.body;

  if(!driverId || !bookingId){
    res.status(400).json({message:"DriverId and bookingId is required!!"});
    return;
  }

  try{
    const driver = await Driver.findOne({driverId});
    if(!driver){
      res.status(404).json({message:"Driver not found!!"});
      return;
    }

    const booking = await BookingModels.findOne({bookingId});
    if(!booking){
      res.status(404).json({message:"Booking not found!!"});
      return;
    }

    if(booking.status !== "pending"){
      res.status(400).json({message:"Booking is not pending"});
      return;
    }

    if(driver.status !== "available"){
      res.status(400).json({message:"Driver is not available"});
      return;
    }

    booking.status = "cancelled";
    driver.status = "available";
    
    await booking.save();
    await driver.save();

    res.status(200).json({message:"Ride cancelled successfully", booking});
  }
  catch(error){
    res.status(500).json({message:"Error cancelling the ride", error});
    return;
  }
} 


// commman endpoints for drivres

export const deteleallShiftsHistory = async(req:Request, res:Response) =>{
  const {driverId} = req.params;

  if(!driverId){
    res.status(400).json({message:"Driverid is required!"})
    return;
  }

  try{
    const driver = await Driver.findOne({driverId});
    if(!driver){
      res.status(404).json({message:"Dirver not found!!"});
      return;
    }

    const shifts = await Shift.find({driverId: driver.driverId});
    if(shifts.length === 0){
      res.status(404).json({message:"No Shifts found!!"});
      return;
    }

    // Delete shifts from driver schema
    driver.shifts = [];
    await driver.save();

    // Delete all shift documents
    await Shift.deleteMany({driverId:driver.driverId});
    res.status(200).json({message:"All shifts deleted succesfully", shifts});
  }
  catch(error){
    res.status(500).json({message:"Error deleting shifts", error});
    return;
  }
}

export const getBookingdeteails = async(req:Request, res:Response) =>{
  const {bookingId} = req.body;

  if(!bookingId) {
    res.status(400).json({message:'Not a vaild bookingId'});
  }

  try{
    const bookings = await BookingModels.findOne({bookingId});
    console.log("Bookings ==> ", bookings);
  }
  catch(error){
    res.status(500).json({message:"Error to fetching the booking"});
  }
}

