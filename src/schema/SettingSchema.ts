import { z } from "zod";

export const SettingSchema = z.object({
    base_price : z.number(),
    km_price: z.number(),
    waiting_time_price_per_minutes: z.number(),
})  