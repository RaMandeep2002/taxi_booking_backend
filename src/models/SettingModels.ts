import mongoose, {Document, Schema} from "mongoose";

export interface ISetting extends Document{
    basePrice: number,
    pricePerKm : number,
}

const SettingSchema: Schema = new Schema({
    basePrice: {type:Number, required: true},
    pricePerKm : {type:Number, required: true}
}) 

export const SettingSchemaModel = mongoose.model<ISetting>("Settings", SettingSchema);