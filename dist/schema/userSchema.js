"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const emailregex = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email().min(10, { message: "email must be correct" }).refine((value) => {
        return emailregex.test(value);
    }, { message: "Invalid email" }),
    password: zod_1.z.string().min(6, "Password must be atleast 6 characters"),
    role: zod_1.z.string().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invaild email format!"),
    password: zod_1.z.string().min(6, "Password must be atleast 6 characters")
});
