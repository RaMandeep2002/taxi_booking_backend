import { z } from "zod";

export const SettingSchema = z.object({
    basePrice: z.number(),
    pricePerKm : z.number(),
})