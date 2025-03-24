"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingSchema = void 0;
const zod_1 = require("zod");
exports.SettingSchema = zod_1.z.object({
    basePrice: zod_1.z.number(),
    pricePerKm: zod_1.z.number(),
});
