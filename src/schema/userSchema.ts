import { z } from "zod";
const emailregex = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
export const registerSchema = z.object({
    name:z.string().min(1, "Name is required"),
    email: z.string().email().min(10, { message: "email must be correct" }).refine((value) => {
        return emailregex.test(value);
    }, { message: "Invalid email" }),
    password:z.string().min(6, "Password must be atleast 6 characters"),
    role:z.string().optional(),
})


export const loginSchema = z.object({
    email:z.string().email("Invaild email format!"),
    password:z.string().min(6, "Password must be atleast 6 characters")
})