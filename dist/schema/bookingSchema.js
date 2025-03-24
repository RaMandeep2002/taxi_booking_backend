"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingSchema = void 0;
const zod_1 = require("zod");
// customerName,
// phoneNumber,
// pickup,
// dropOff,
// pickuptime,
const phoenValidation = new RegExp(/^(?:\+91|91|0)?[6789]\d{9}$/);
exports.bookingSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(3, "Name is required!"),
    phoneNumber: zod_1.z.string().min(10, { message: "Phone number must be at least 10 digits" }).refine((value) => {
        return phoenValidation.test(value);
    }, { message: "Invalid phone number" }),
    pickup: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        address: zod_1.z.string()
    }),
    dropOff: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        address: zod_1.z.string()
    }),
    pickuptime: zod_1.z.string()
});
