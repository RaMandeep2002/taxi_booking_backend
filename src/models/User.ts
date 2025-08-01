import mongoose, { Document, mongo, Schema } from "mongoose";
import { Roles } from "../types/roles";

// export enum Roles {
//   Admin = "admin",
//   Driver = "driver",
//   Customer = "customer",
// }

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Roles;
  status:boolean;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(Roles),
    default: Roles.Customer,
    required: true,
  },
  status:{
    type:Boolean,
    default:true,
  }
});

export default mongoose.model<IUser>("User", UserSchema);
