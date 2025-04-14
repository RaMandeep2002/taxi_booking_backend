// drivername, email, driversLicenseNumber, phoneNumber, password 
import { z } from "zod";
//email regex
const emailregex = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
const phoneValidation = new RegExp(/^(?:\+91|91|0)?[6789]\d{9}$/);
const canadianPhoneRegex = new RegExp(/^(\+1[- ]?)?(\(?[2-9][0-9]{2}\)?[- ]?)?[2-9][0-9]{2}[- ]?[0-9]{4}$/);
export const DriverAddSchema = z.object({
    drivername: z.string(),
    email: z.string().email().min(10, { message: "email must be correct" }).refine((value) => {
        return emailregex.test(value);
    }, { message: "Invalid email" }),
    driversLicenseNumber: z.string(),
    // phoneNumber: z.string().min(10, { message: "Phone number must be atleast 10 digits" }).refine((value) => {
    //     return phoneValidation.test(value);
    // }, { message: "Invalid phone number. Must be a valid Indian phone number starting with +91, 91, 0 or just 10 digits" }),
    phoneNumber: z
    .string()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .refine((value) => canadianPhoneRegex.test(value), {
      message: "Invalid Canadian phone number",
    }),
    password: z.string()
})
// make, vehicleModel, year, status
export const registerVehicleSchema = z.object({
    driverId:z.string(),
    company: z.string().min(3, "Car make atleast more than 6 charaters"),
    vehicleModel: z.string().min(3, "Car vehicleModel atleast more than 6 charaters"),
    year:z.number(),
    status: z.enum(["active", "free"]) 
})

export const registerSharedVehicleSchema = z.object({
    company: z.string().min(3, "Car make atleast more than 6 charaters"),
    vehicleModel: z.string().min(3, "Car vehicleModel atleast more than 6 charaters"),
    year:z.number(),
    status: z.enum(["active", "free"]) 
})