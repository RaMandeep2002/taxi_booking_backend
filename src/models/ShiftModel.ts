import mongoose, { Document, Schema } from "mongoose";
import { string } from "zod";

// Interface for Shift

// startDate,
// startTimeFormatted,
// startMonth,
// startWeek,
export interface IShift extends Document {
  driverId: string;
  vehicleUsed: mongoose.Types.ObjectId;
  startTime: string;
  startDate:string;
  startTimeFormatted:string;
  startMonth:string;
  startWeek:string;
  endTime?: string;
  endDate:string;
  endTimeFormatted:string;
  endMonth:string;
  endWeek:string;
  totalDuration?:string;
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
      type: String,
      required: true,
    },
    startDate:{
      type:String,
    },
    startTimeFormatted:{
      type:String,
    },
    startMonth:{
      type:String,
    },
    startWeek:{
      type:String,
    },
    endTime: {
      type: String,
    },
    endDate:{
      type:String,
    },
    endTimeFormatted:{
      type:String,
    },
    endMonth:{
      type:String,
    },
    endWeek:{
      type:String,
    },
    totalDuration:{
      type:String,
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

// Create and export model
export const Shift = mongoose.model<IShift>("Shift", ShiftSchema); 