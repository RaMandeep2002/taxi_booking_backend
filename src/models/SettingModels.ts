import mongoose, {Document, Schema} from "mongoose";

export interface ISetting extends Document{
    flag_price: number,
    basePrice: number,
    pricePerKm : number,
}

const SettingSchema: Schema = new Schema({
    flag_price: {type: Number },
    basePrice: {type:Number},
    pricePerKm : {type:Number}
}) 

export const SettingSchemaModel = mongoose.model<ISetting>("Settings", SettingSchema);