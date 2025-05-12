import mongoose, { Document, Schema } from "mongoose";

export interface IScheduleRide extends Document {
    customerName: string;
    customer_phone_number:string;
    pickuptime: string;
    pickupDate: string;
    pickupAddress: string;
    dropOffAddress: string;
    status: "schedule" | "Pickup";
}


const ScheduleRideSchema: Schema = new Schema<IScheduleRide>({
    customerName:{
        type:String,
    },
    customer_phone_number:{type:String},
    pickuptime: { type: String, required: true },
    pickupDate: { type: String, required: true },
    pickupAddress: {type:String},
    dropOffAddress: {type:String},
    status: { type: String, enum: ["schedule", "Pickup"], default: "schedule" }
}, { timestamps: true });

export default mongoose.model<IScheduleRide>("ScheduleRide", ScheduleRideSchema);

