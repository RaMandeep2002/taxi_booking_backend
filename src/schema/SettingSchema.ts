import { z } from "zod";

export const SettingSchema = z.object({
    flag_price : z.number(),
    distance_price_per_meter: z.number(),
    waiting_time_price_per_seconds : z.number(),
})