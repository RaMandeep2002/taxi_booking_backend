import { z } from "zod";

const phoenValidation = new RegExp(/^(?:\+91|91|0)?[6789]\d{9}$/);
const canadianPhoneRegex = new RegExp(/^(\+1[- ]?)?(\(?[2-9][0-9]{2}\)?[- ]?)?[2-9][0-9]{2}[- ]?[0-9]{4}$/);

export const bookingSchema = z.object({
    // phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits" }).refine((value) => {
    //     return phoenValidation.test(value);
    // }, { message: "Invalid phone number" }),
    customerName: z.string().optional(),
    phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits" }).refine((value) => {
        return canadianPhoneRegex.test(value);
    }, { message: "Invalid Canadian phone number" }),
    pickup: z.object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.string()
    }),
    dropOff: z.object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.string()
    }),
    pickuptime: z.string()
})