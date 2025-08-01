import { Request, Response } from "express";
import crypto, { Verify } from "crypto";
// import bcrypt from "bcryptjs";
import BookingModels, { IBooking } from "../models/BookingModels";
import User from "../models/User";
import { bookingSchema } from "../schema/bookingSchema";
import redisClinet from "../config/redis";
import { Shift } from "../models/ShiftModel";
import { Driver } from "../models/DriverModel";
import { Vehicle } from "../models/VehicleModel";

const generateBookingId = () => {
  const bookingId = crypto.randomBytes(4).toString("hex");
  return bookingId;
};

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return weekNumber;
};

export const bookingRide = async (req: Request, res: Response) => {
  try {
    const validationResult = bookingSchema.safeParse(req.body)
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.errors });
      return;
    }
    const {
      customerName,
      phoneNumber,
      pickup,
      dropOff,
      pickuptime,
    } = validationResult.data;

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

    const pickupDateIST = new Date(pickupDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const currentDateIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (pickupDateIST < currentDateIST) {
      res.status(400).json({ message: "Pickup time cannot be in the past" });
      return;
    }

    const pickupDateISO = pickupDate.toISOString().split("T")[0];

    const existingBooking = await BookingModels.findOne({
      phoneNumber,
      pickupDate: pickupDateISO,
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
      pickuptime: new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      }).format(pickupDate),
      pickupDate: pickupDateISO,
      pickupTimeFormatted: new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      }).format(pickupDate),
      pickupMonth: pickupDate.toLocaleString("default", { month: "long" }),
      pickupWeek: getWeekNumber(pickupDate)
    });

    console.log("newBooking ===> ", newBooking)

    await newBooking.save();
    res
      .status(201)
      .json({ message: "Booking created successfully", booking: newBooking });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
    console.log("Something went wrong! ==> ", error.message);
  }
};


export const getAllBookingRider = async (req: Request, res: Response) => {
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

    // const cacheKey = "bookingHistory"; // Define a unique cache key
    // const cachedData = await redisClinet.get(cacheKey); // Check if data is in Redis

    // if (cachedData) {
    //    res.status(200).json({ message: "Fetched from cache", bookings: JSON.parse(cachedData) });
    //    return;
    // }
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
        // {
        //   $unwind: {
        //     path: "$driver.vehicles",
        //     preserveNullAndEmptyArrays: true, 
        //   },
        // },
        {
          $project: {
            bookingId: 1,
            customerName: 1,
            pickupDate: 1,
            pickup: 1,
            pickuptime:1,
            dropOff: 1,
            totalFare:1,
            paymentStatus: 1,
            status: 1,
            // Driver details
            "driver.drivername": 1,
            "driver.email": 1,
          },
        },
      ])

      console.log("Bookings ===> ", bookings)

    if (!bookings.length) {
      res.status(404).json({ message: "No booking found" });
      return;
    }

    // await redisClinet.set(cacheKey, JSON.stringify(bookings), { EX: 600 });

    res.status(200).json({message:"Successfully fetch the History", bookings});
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getTheUserInformation = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ role: "customer" });
    console.log("users ===> ", users);

    if (!users) {
      res.status(404).json({ message: "users not found!!" });
    }

    res.status(200).json({ message: "users fetch successfully!!", users });
  }
  catch (error) {
    res.status(500).json({ message: "Failed to fetch the users!!", error });
  }
}

export const getCount = async (req: Request, res: Response) => {
  try {
    const driverCount = await Driver.countDocuments();
    const vehicle = await Vehicle.countDocuments();
    const bookings = await BookingModels.countDocuments();
    const shifts = await Shift.countDocuments();
    res.status(200).json({
      driverCount: driverCount,
      vehicleCount: vehicle,
      bookingCount: bookings,
      shiftsCount: shifts
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to count drivers", error });
  }
};