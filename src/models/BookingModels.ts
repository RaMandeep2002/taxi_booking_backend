import mongoose, { Document, Schema, Types } from "mongoose";
import { number, string } from "zod";

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface IBooking extends Document {
  bookingId: string;
  customerName: string;
  phoneNumber: number;
  pickup: Location;
  dropOff: Location;
  pickuptime: string;
  pickupDate: string;
  pickupTimeFormatted: string;
  dropdownDate: string;
  dropdownTime: string;
  arrived: boolean;
  pickupMonth: string;
  pickupWeek: number;
  fareAmount: number;
  distance: number;
  totalFare: number;
  original_Fare_before_round:number;
  discount_price : number;
  after_discount_price: number;
  wating_time : number;
  wating_time_formated: string;
  driver: Types.ObjectId;
  vehicleUsed: Types.ObjectId;
  paymentStatus: "pending" | "paid";
  paymentMethod: "cash" | "card" | "online";
  status: "pending" | "accepted" | "ongoing" | "completed" | "cancelled";
  // bookingStatus: "pending" | "confirmed" | "cancelled";
}

const BookingSchema: Schema = new Schema({
  bookingId: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
  },
  phoneNumber: {
    type: Number,
  },
  pickup: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },
  dropOff: {
    // Fixed key name to match the IBooking interface
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },  
  pickuptime: {
    type: String,
    required: true,
  },
  pickupDate: {
    type: String,
    required: true,
  },
  pickupTimeFormatted: {
    type: String,
    required: true,
  },
  pickupMonth: {
    type: String,
    required: true,
  },
  pickupWeek: {
    type: Number,
    required: true,
  },
  dropdownDate: {
    type: String,
    default: 0,
  },
  dropdownTime: {
    type: String,
    default: 0,
  },
  arrived: {
    type: Boolean,
    default: false,
  },
  fareAmount: {
    type: Number,
    defalut: 0,
  },
  distance: {
    type: Number,
    default: 0,
  },
  totalFare: {
    type: Number,
    default: 0,
  },
  original_Fare_before_round:{
    type:Number,
    default: 0,
  },
  discount_price : {
    type:Number,
    default: 0
  },
  after_discount_price: {
    type:Number,
    default:0
  },
  wating_time:{
    type:Number,
    default:0
  },
  wating_time_formated:{
    type:String,
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: "Driver",
  },
  vehicleUsed:{
    type:Schema.Types.ObjectId,
    ref:"Vehicle",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "online"],
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
    default: "pending",
  },
}, { timestamps: true });

export default mongoose.model<IBooking>("Booking", BookingSchema);
