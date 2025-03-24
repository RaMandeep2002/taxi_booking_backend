"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
dotenv_1.default.config();
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const bookingRouter_1 = __importDefault(require("./routers/bookingRouter"));
const authRouter_1 = __importDefault(require("./routers/authRouter"));
const adminRouter_1 = __importDefault(require("./routers/adminRouter"));
const driverRoute_1 = __importDefault(require("./routers/driverRoute"));
const PORT = process.env.PORT;
const app = (0, express_1.default)();
(0, database_1.connectDb)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).json({ err: "something went working!" });
});
app.get("/", (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: "Welcome to the cypresstaxi API",
        });
    }
    catch (error) {
        // next(error);
        console.log("error ==> ", error);
    }
});
app.use("/customer", bookingRouter_1.default);
app.use("/api/auth", authRouter_1.default);
app.use("/admin", adminRouter_1.default);
app.use("/api/driver", driverRoute_1.default);
app.listen(PORT, () => {
    console.log(`server is listen on http://localhost:${PORT}`);
});
