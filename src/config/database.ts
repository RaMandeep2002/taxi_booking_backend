import mongoose from "mongoose";

export const connectDb = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/ride-booking");
    console.log("Database connected");
  } catch (err: any) {
    console.log("Database connection error ==> ", err);
    process.exit(1);
  }
};
