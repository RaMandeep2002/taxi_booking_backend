"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auhtController_1 = require("../controller/auhtController");
const router = express_1.default.Router();
router.post("/register", auhtController_1.register);
// Login endpoint
router.post("/login", auhtController_1.loginuser);
exports.default = router;
