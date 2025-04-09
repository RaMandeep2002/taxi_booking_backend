import mongoose, { Document, Schema, Types } from "mongoose";

// Interface for Vehicle
export interface IVehicle extends Document {
  registrationNumber: string;
  company: string;
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
    company: {
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

// Create and export model
export const Vehicle = mongoose.model<IVehicle>("Vehicle", VehicleSchema); 