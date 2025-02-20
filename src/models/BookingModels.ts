import mongoose, { Document, Schema } from "mongoose";

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
  pickupMonth: string;
  pickupWeek: number;
  fareAmount: number;
  distance: number;
  totalFare: number;
  paymentStatus: "pending" | "paid";
  paymentMethod: "cash" | "card" | "online";
  status: "pending"| "accepted"| "ongoing"| "completed"| "cancelled";
  // bookingStatus: "pending" | "confirmed" | "cancelled";
}

const BookingSchema: Schema = new Schema({
  bookingId: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: Number,
    required: true,
  },
  pickup: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true },
  },
  dropOff: {
    // Fixed key name to match the IBooking interface
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true },
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
});

export default mongoose.model<IBooking>("Booking", BookingSchema);
