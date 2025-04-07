import { z } from "zod";

export const SettingSchema = z.object({
    flag_price : z.number(),
    basePrice: z.number(),
    pricePerKm : z.number(),
})