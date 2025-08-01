import mongoose, {Document, Schema} from "mongoose";

export interface ISetting extends Document{
    base_price: number,
    km_price: number,
    waiting_time_price_per_minutes : number,
}

const SettingSchema: Schema = new Schema({
    base_price: {type: Number },
    km_price: {type:Number},
    waiting_time_price_per_minutes : {type:Number}
}) 

export const SettingSchemaModel = mongoose.model<ISetting>("Settings", SettingSchema);


// base_price : z.number(),
// km_price: z.number(),
// waiting_time_price_per_minutes : z.number(),