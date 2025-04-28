// import mongoose, { Document, Schema } from "mongoose";

// export interface Location {
//     latitude: number;
//     longitude: number;
//     address: string;
// }

// export interface IScheduleRide extends Document {
//     driverId: string;
//     vehicle_plate_number: string;
//     customerName: string;
//     pickup: Location;
//     dropOff: Location;
//     pickuptime: string;
//     pickupDate: string;
//     status: "schedule" | "Pickup";
// }


// const ScheduleRideSchema: Schema = new Schema<IScheduleRide>({
//     driverId: { type: String, required: true },
//     vehicle_plate_number: { type: String, required: true },
//     customerName:{type:String, required:true},
//     pickup: {
//         latitude: { type: Number },
//         longitude: { type: Number },
//         address: { type: String },
//     },
//     dropOff: {
//         // Fixed key name to match the IBooking interface
//         latitude: { type: Number },
//         longitude: { type: Number },
//         address: { type: String },
//     },
//     pickuptime: { type: String, required: true },
//     pickupDate: { type: String, required: true },
//     status: { type: String, enum: ["schedule", "Pickup"], default: "schedule" }
// }, { timestamps: true });

// export default mongoose.model<IScheduleRide>("ScheduleRide", ScheduleRideSchema);

