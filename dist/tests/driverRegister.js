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
function getJwtToken() {
    const loginurl = "http://localhost:5000/api/auth/login";
    const payload = JSON.stringify({
        email: "admin1@gmail.com",
        password: "deepadmin1ramandeep"
    });
    const params = {
        headers: { "Content-type": "application/json" },
    };
    const response = http_1.default.post(loginurl, payload, params);
    const responseBody = JSON.parse(response.body);
    if (response.status === 200 && responseBody.token) {
        return responseBody.token; // Assuming the response contains { token: "your_jwt_token" }
    }
    console.error('Failed to obtain JWT token:', response.body);
    return null;
}
function default_1() {
    const token = getJwtToken();
    console.log("Token ====> ", token);
    if (!token) {
        console.log("JWT token not received, skipping test.");
        return;
    }
    const url = "http://localhost:5000/admin/add-driver";
    const payload = {
        drivername: `TestUser${Math.floor(Math.random() * 1000)}`,
        email: `test${Math.floor(Math.random() * 10000)}@example.com`,
        driversLicenseNumber: `PB${Math.floor(Math.random() * 10000)}`,
        phoneNumber: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        password: `Test${Math.floor(Math.random() * 10000)}@1234`,
    };
    console.log("payload ==> ", payload);
    const params = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // Attach JWT token in the Authorization header
        },
    };
    const res = http_1.default.post(url, JSON.stringify(payload), params);
    (0, k6_1.check)(res, {
        'is status 201': (r) => r.status === 201,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'response contains success message': (r) => {
            const body = r.body;
            return JSON.parse(body).message === 'Driver added Successfully';
        },
    });
    (0, k6_1.sleep)(1);
}
