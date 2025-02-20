"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDb = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDb = async () => {
    try {
        await mongoose_1.default.connect("mongodb://localhost:27017/ride-booking");
        console.log("Database connected");
    }
    catch (err) {
        console.log("Database connection error ==> ", err);
        process.exit(1);
    }
};
exports.connectDb = connectDb;
