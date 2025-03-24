"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
        res.status(401).json({ message: "Access Denied" });
        return;
    }
    try {
        const secret = process.env.JWT_SECRET || "cypres";
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        if (!req.user.id) {
            res.status(401).json({ message: "Invalid token structure" });
            return;
        }
        next();
    }
    catch (error) {
        res.status(401).json({ error: "Invaild Token" });
        return;
    }
};
exports.authenticate = authenticate;
