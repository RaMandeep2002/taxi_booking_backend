"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginuser = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const userSchema_1 = require("../schema/userSchema");
const register = async (req, res) => {
    const validationResult = userSchema_1.registerSchema.safeParse(req.body);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { name, email, password, role } = validationResult.data;
    try {
        const exsitingUser = await User_1.default.findOne({ email });
        if (exsitingUser) {
            res.status(400).json({ message: "User already exists!" });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = new User_1.default({ name, email, password: hashedPassword, role });
        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error registering user!", error });
    }
};
exports.register = register;
const loginuser = async (req, res) => {
    const validationResult = userSchema_1.loginSchema.safeParse(req.body);
    if (!validationResult.success) {
        res.status(400).json({ errors: validationResult.error.errors });
        return;
    }
    const { email, password } = validationResult.data;
    try {
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const secret = process.env.JWT_SECRET || "cypres";
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, secret, {
            expiresIn: "1h",
        });
        // const token = jwt.sign({ id: user._id, role: user.role }, secret);
        res.status(200).json({ message: "Login successful", token });
    }
    catch (error) {
        res.status(500).json({ message: "Error logging in", error });
    }
};
exports.loginuser = loginuser;
