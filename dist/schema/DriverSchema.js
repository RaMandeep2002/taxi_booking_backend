"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerVehicleSchema = exports.DriverAddSchema = void 0;
// drivername, email, driversLicenseNumber, phoneNumber, password 
const zod_1 = require("zod");
//email regex
const emailregex = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
const phoneValidation = new RegExp(/^(?:\+91|91|0)?[6789]\d{9}$/);
exports.DriverAddSchema = zod_1.z.object({
    drivername: zod_1.z.string().min(6, "Required atleast more than 6 charater"),
    email: zod_1.z.string().email().min(10, { message: "email must be correct" }).refine((value) => {
        return emailregex.test(value);
    }, { message: "Invalid email" }),
    driversLicenseNumber: zod_1.z.string(),
    phoneNumber: zod_1.z.string().min(10, { message: "Phone number must be atleast 10 digits" }).refine((value) => {
        return phoneValidation.test(value);
    }, { message: "Invalid phone number. Must be a valid Indian phone number starting with +91, 91, 0 or just 10 digits" }),
    password: zod_1.z.string()
});
// make, vehicleModel, year, status
exports.registerVehicleSchema = zod_1.z.object({
    make: zod_1.z.string().max(3, "Car make atleast more than 6 charaters"),
    vehicleModel: zod_1.z.string().min(3, "Car vehicleModel atleast more than 6 charaters"),
    year: zod_1.z.number(),
    status: zod_1.z.enum(["active", "free"])
});
