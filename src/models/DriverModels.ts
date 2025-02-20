import mongoose, { Document, Schema, Types } from "mongoose";

// Interface for Vehicle
export interface IVehicle extends Document {
  registrationNumber: string;
  make: string;
  vehicleModel: string;
  year: number;
  status: "active" | "free";
  currentDriver?: Types.ObjectId;
  isActive: boolean;
}

// Vehicle Schema
const VehicleSchema: Schema = new Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    make: {
      type: String,
      required: true,
    },
    vehicleModel: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "free"],
      default: "free",
    },
    currentDriver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Interface for Shift
export interface IShift extends Document {
  driverId: string;
  vehicleUsed: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  totalEarnings: number;
  totalTrips: number;
  totalDistance: number;
  distance: number;
  isActive: boolean;
}

// Shift Schema
const ShiftSchema: Schema = new Schema(
  {
    driverId: {
      type: String,
      ref: "Driver",
      required: true,
    },
    vehicleUsed: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    totalDistance: {
      type: Number,
      default: 0,
    },
    distance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Interface for Driver
export interface IDriver extends Document {
  driverId: string;
  drivername: string;
  email: string;
  phoneNumber: number;
  driversLicenseNumber?: string;
  vehicle: Types.ObjectId[];
  isOnline: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  status: "available" | "busy" | "not working";
  shifts: Types.ObjectId[];
}

// Driver Schema
const DriverSchema: Schema = new Schema(
  {
    driverId: {
      type: String,
      required: true,
      unique: true,
    },
    drivername: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: Number,
      required: true,
    },
    driversLicenseNumber: {
      type: String,
    },
    vehicle: [
      {
        type: Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    ],
    isOnline: {
      type: Boolean,
      default: false,
    },
    location: {
      latitude: {
        type: Number,
        default: 0,
      },
      longitude: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["available", "busy", "not working"],
      default: "available",
    },
    shifts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Shift",
      },
    ],
  },
  { timestamps: true }
);

// Create and export models
export const Vehicle = mongoose.model<IVehicle>("Vehicle", VehicleSchema);
export const Shift = mongoose.model<IShift>("Shift", ShiftSchema);
export const Driver = mongoose.model<IDriver>("Driver", DriverSchema);