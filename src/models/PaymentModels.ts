import mongoose , {Document, Schema, Types} from "mongoose";

export interface IPayment extends Document{
    paymentId:string,
    bookingId: string,
    driver: string,
    amount :number,
    paymentStatus: "pending" | "paid" | "failed";
    paymentMethod: "cash" | "card" | "online";
    transactionId? :string;
    timestamp:Date;
}

const PaymentSchema: Schema = new Schema({
    paymentId:{
        type:String,
        required:true,
        unique:true,
    },
    booking:{
        type:Schema.Types.ObjectId,
        ref:"Booking",
        required:true
    },
    driver:{
        type:Schema.Types.ObjectId,
        ref:"Driver",
        required:true
    },
    amount:{
        type:Number,
        requried:true,
    },
    paymentStatus:{
        type:String,
        enum:["pending" , "paid" , "failed"],
        default:"pending"
    },
    paymentMethod:{
        type:String,
        enum:["cash" , "card" , "online"],
        required:true
    },
    transactionId:{
        type:String,
        default:null
    },
    timestamp:{
        type:Date,
        default:Date.now,
    }
},{timestamps:true});

export default mongoose.model<IPayment>("Payments", PaymentSchema)

