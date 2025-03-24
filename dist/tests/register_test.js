"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = void 0;
exports.default = default_1;
const http_1 = __importDefault(require("k6/http"));
const k6_1 = require("k6");
exports.options = {
    stages: [
        { duration: '5s', target: 5 }, // Ramp up to 5 users
        { duration: '10s', target: 5 }, // Stay at 5 users
        { duration: '5s', target: 0 }, // Ramp down
    ]
};
function default_1() {
    const url = "http://localhost:5000/api/auth/register";
    const payload = {
        name: `TestUser${Math.floor(Math.random() * 1000)}`,
        email: `test${Math.floor(Math.random() * 10000)}@example.com`,
        password: `Test${Math.floor(Math.random() * 10000)}@1234`,
        role: 'admin',
    };
    console.log("payload ===> ", payload);
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const res = http_1.default.post(url, JSON.stringify(payload), params);
    (0, k6_1.check)(res, {
        'is status 201': (r) => r.status === 201,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'response contains success message': (r) => {
            const body = r.body;
            return JSON.parse(body).message === 'User registered successfully';
        },
    });
    (0, k6_1.sleep)(1);
}
