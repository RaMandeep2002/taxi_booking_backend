"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Driver Schema
const DriverSchema = new mongoose_1.Schema({
    driverId: {
        type: String,
        required: true,
        unique: true,
    },
    drivername: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phoneNumber: {
        type: Number,
        required: true,
    },
    driversLicenseNumber: {
        type: String,
    },
    vehicle: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Vehicle",
        },
    ],
    isOnline: {
        type: Boolean,
        default: false,
    },
    location: {
        latitude: {
            type: Number,
            default: 0,
        },
        longitude: {
            type: Number,
            default: 0,
        },
    },
    status: {
        type: String,
        enum: ["available", "busy", "not working"],
        default: "available",
    },
    shifts: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Shift",
        },
    ],
}, { timestamps: true });
// Create and export model
exports.Driver = mongoose_1.default.model("Driver", DriverSchema);
