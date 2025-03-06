import { Request, Response } from "express";
import crypto, { Verify } from "crypto";
// import bcrypt from "bcryptjs";
import BookingModels, { IBooking } from "../models/BookingModels";

const generateBookingId = () => {
  const bookingId = crypto.randomBytes(4).toString("hex");
  return bookingId;
};

function getWeekNumber (date: Date): number{
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return weekNumber;
};

export const bookingRide = async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      phoneNumber,
      pickup,
      dropOff,
      pickuptime,
    } = req.body;

    if (
      !customerName ||
      !phoneNumber ||
      !pickup ||
      !dropOff ||
      !pickuptime 
    ) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const pickupDate = new Date(pickuptime);
    console.log("time ==> ", pickupDate);

    // if(!isNaN(pickupDate.getTime()) || pickupDate < new Date()){
    //   res.status(400).json({message:"Invaild or past pickup time."});
    //   return;
    // }

    if(pickupDate < new Date()){
      res.status(400).json({message:"Invaild or past pickup time."});
      return;
    }


    // Check if user already has a booking for this pickup time
    const existingBooking = await BookingModels.findOne({
      phoneNumber,
      pickupDate: new Date(pickuptime).toISOString().split("T")[0],
      status: { $ne: "cancelled" } // Exclude cancelled bookings
    }); 

    if (existingBooking) {
      res.status(400).json({ message: "You already have an active booking for this date" });
      return;
    }

    const bookingId = generateBookingId();
    const newBooking = new BookingModels({
      bookingId,
      customerName,
      phoneNumber,
      pickup,
      dropOff,
      pickuptime: pickupDate.toISOString(),
      pickupDate: pickupDate.toISOString().split("T")[0],
      pickupTimeFormatted: pickupDate.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit", 
        hour12: true,
        timeZone: "Asia/Kolkata"
      }),
      pickupMonth: pickupDate.toLocaleString("default", { month: "long" }),
      pickupWeek: getWeekNumber(pickupDate)
    });

    await newBooking.save();
    res
      .status(201)
      .json({ message: "Booking created successfully", booking: newBooking });
  } catch (error: any) {
    res.status(400).json({ message: error.message }); 
    console.log("Something went wrong! ==> ", error.message);
  }
};


export const getAllBookingRider = async (req:Request, res: Response) => {
  console.log("entered")
  try {
    // const { bookingId } = req.params;
    const booking = await BookingModels.find();
    if (!booking.length) {
      res.status(404).json({ message: "Booking not found." });
      return;
    }

    res.status(200).json({ message: "Booking found.", booking });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
    console.log("Something went wrong! ==> ", error.message);
  }
};



export const bookingHistory = async (req: Request, res: Response) => {
  try {
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
            pickuptime: 1,
            totalFare:1,
            paymentStatus: 1,
            status: 1,
            // Driver details
            "driver.drivername": 1,
            "driver.email": 1,
          },
        },
      ])

    if (!bookings.length) {
      res.status(404).json({ message: "No booking found" });
      return;
    }

    res.status(200).json({message:"Successfully fetch the History", bookings});
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};