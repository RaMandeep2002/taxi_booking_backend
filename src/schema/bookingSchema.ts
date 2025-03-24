import { z } from "zod";

// customerName,
// phoneNumber,
// pickup,
// dropOff,
// pickuptime,

const phoenValidation = new RegExp(/^(?:\+91|91|0)?[6789]\d{9}$/);
export const bookingSchema = z.object({
    customerName: z.string().min(3, "Name is required!"),
    phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits" }).refine((value) => {
        return phoenValidation.test(value);
    }, { message: "Invalid phone number" }),
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