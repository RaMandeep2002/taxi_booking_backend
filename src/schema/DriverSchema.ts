// drivername, email, driversLicenseNumber, phoneNumber, password 
import { z } from "zod";
//email regex
const emailregex = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
const phoneValidation = new RegExp(/^(?:\+91|91|0)?[6789]\d{9}$/);
const canadianPhoneRegex = new RegExp(/^(\+1[- ]?)?(\(?[2-9][0-9]{2}\)?[- ]?)?[2-9][0-9]{2}[- ]?[0-9]{4}$/);
export const DriverAddSchema = z.object({
    drivername: z.string({ required_error: "Driver name is required" })
        .min(2, { message: "Driver name must be at least 2 characters long" }),
    email: z
        .string({ required_error: "Email is required" })
        .email({ message: "Please enter a valid email address" })
        .refine((value) => emailregex.test(value), { message: "Email format is invalid" }),
    driversLicenseNumber: z
        .string({ required_error: "Driver's license number is required" })
        .min(5, { message: "Driver's license number must be at least 5 characters long" }),
    // phoneNumber: z.string().min(10, { message: "Phone number must be atleast 10 digits" }).refine((value) => {
    //     return phoneValidation.test(value);
    // }, { message: "Invalid phone number. Must be a valid Indian phone number starting with +91, 91, 0 or just 10 digits" }),
    driversLicJur: z.string({
        required_error: "Driver's License Jurisdiction is required",
    }).min(2, {
        message: "Driver's License Jurisdiction must be at least 2 characters long",
    }),
    phoneNumber: z
        .string({ required_error: "Phone number is required" })
        .min(10, { message: "Phone number must be at least 10 digits" }),
    // .refine((value) => canadianPhoneRegex.test(value), {
    //   message: "Invalid Canadian phone number",
    // }),
    password: z
        .string({ required_error: "Password is required" })
        .min(6, { message: "Password must be at least 6 characters long" }),
})

export const updateDriverAddSchema = z.object({
    drivername: z.string(),
    email: z.string().email().min(10, { message: "email must be correct" }).refine((value) => {
        return emailregex.test(value);
    }, { message: "Invalid email" }),
    driversLicenseNumber: z.string({ required_error: "Driver's license number is required" })
        .min(5, { message: "Driver's license number must be at least 5 characters long" }),

    driversLicJur: z.string({
        required_error: "Driver's License Jurisdiction is required",
    }).min(2, {
        message: "Driver's License Jurisdiction must be at least 2 characters long",
    }),
    // phoneNumber: z.string().min(10, { message: "Phone number must be atleast 10 digits" }).refine((value) => {
    //     return phoneValidation.test(value);
    // }, { message: "Invalid phone number. Must be a valid Indian phone number starting with +91, 91, 0 or just 10 digits" }),
    phoneNumber: z
        .string({ required_error: "Phone number is required" })
        .min(10, { message: "Phone number must be at least 10 digits" }),
    // .refine((value) => canadianPhoneRegex.test(value), {
    //   message: "Invalid Canadian phone number",
    // }),
    password: z.string().optional()
})
// make, vehicleModel, year, status
export const registerVehicleSchema = z.object({
    driverId: z.string(),
    company: z.string().min(3, "Car make atleast more than 6 charaters"),
    vehicleModel: z.string().min(3, "Car vehicleModel atleast more than 6 charaters"),
    year: z.number(),
    status: z.enum(["active", "free"])
})

export const registerSharedVehicleSchema = z.object({
    registrationNumber: z.string().
        min(17, { message: "Registration Number is Required!" }),
    company: z.string({
        required_error: "Company name is required",
    })
        .min(3, { message: "Company name must be at least 3 characters long" }),
    vehicleModel: z.string({
        required_error: "Vehicle model is required",
    })
        .min(3, { message: "Vehicle model must be at least 3 characters long" }),
    year: z.number({
        required_error: "Year is required",
    })
        .int({ message: "Year must be an integer" })
        .min(1900, { message: "Year cannot be earlier than 1900" })
        .max(new Date().getFullYear() + 1, { message: "Year cannot be too far in the future" }),

    vehicle_plate_number: z.string({
        required_error: "License plate number is required",
    })
        .min(3, { message: "License plate number must be at least 3 characters long" }),

    vehRegJur: z.string({ required_error: "Vehicle Registration Jurisdiction is required" }).min(2, { message: "Vehicle Registration Jurisdiction must be atleast 2 character long" }),
    tripTypeCd: z.string({ required_error: "Trip Type Code is required" }).min(1, { message: "Trip Type Code must not be empty" })
})

export const updateVehicleSchema = z.object({
    registrationNumber: z.string().
        min(6, { message: "Registration Number is Required!" }),
    company: z.string({
        required_error: "Company name is required",
    })
        .min(3, { message: "Company name must be at least 3 characters long" }),
    vehicleModel: z.string({
        required_error: "Vehicle model is required",
    })
        .min(3, { message: "Vehicle model must be at least 3 characters long" }),
    year: z.number({
        required_error: "Year is required",
    })
        .int({ message: "Year must be an integer" })
        .min(1900, { message: "Year cannot be earlier than 1900" })
        .max(new Date().getFullYear() + 1, { message: "Year cannot be too far in the future" }),
    vehicle_plate_number: z.string({
        required_error: "License plate number is required",
    })
        .min(3, { message: "License plate number must be at least 3 characters long" }),
    vehRegJur: z.string({ required_error: "Vehicle Registration Jurisdiction is required" }).min(2, { message: "Vehicle Registration Jurisdiction must be atleast 2 character long" }),
    tripTypeCd: z.string({ required_error: "Trip Type Code is required" }).min(1, { message: "Trip Type Code must not be empty" })
})
