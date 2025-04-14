import { z } from "zod";

export const SettingSchema = z.object({
    base_price : z.number(),
    km_price: z.number(),
    waiting_time_price_per_minutes: z.number()
    .refine(val => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: "Must be a number with up to two decimal places"
    }),
})  