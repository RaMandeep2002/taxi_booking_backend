import mongoose, {Document, Schema} from "mongoose";

export interface ISetting extends Document{
    flag_price: number,
    distance_price_per_meter: number,
    waiting_time_price_per_seconds : number,
}

const SettingSchema: Schema = new Schema({
    flag_price: {type: Number },
    distance_price_per_meter: {type:Number},
    waiting_time_price_per_seconds : {type:Number}
}) 

export const SettingSchemaModel = mongoose.model<ISetting>("Settings", SettingSchema);