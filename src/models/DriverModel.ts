import mongoose, { Document, Schema, Types } from "mongoose";

// Interface for Driver
export interface IDriver extends Document {
  driverId: string;
  drivername: string;
  email: string;
  phoneNumber: string;
  driversLicenseNumber?: string;
  driversLicJur?:string;
  vehicle: Types.ObjectId[];
  isOnline: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  status: "available" | "busy" | "not working";
  shifts: Types.ObjectId[];
  isActive : boolean;
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
      type: String,
      required: true,
    },
    driversLicenseNumber: {
      type: String,
    },
    driversLicJur:{
      type:String,
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
    isActive : {type:Boolean, default:true},
  },
  { timestamps: true }
);

// Create and export model
export const Driver = mongoose.model<IDriver>("Driver", DriverSchema); 