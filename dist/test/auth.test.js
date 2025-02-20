"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = __importDefault(require("sinon"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auhtController_1 = require("../controller/auhtController");
const User_1 = __importDefault(require("../models/User"));
describe("Auth controller", () => {
    let req;
    let res;
    let statusStub;
    let jsonStub;
    beforeEach(() => {
        statusStub = sinon_1.default.stub();
        jsonStub = sinon_1.default.stub();
        res = {
            status: statusStub.returns({ json: jsonStub }),
            json: jsonStub
        };
    });
    afterEach(() => {
        sinon_1.default.restore();
    });
    describe("register", () => {
        it("should successfully register a new user", async () => {
            const userData = {
                name: "john",
                email: "johndeo123123@gmail.com",
                password: "password@123",
                rele: "admin"
            };
            req = { body: userData };
            sinon_1.default.stub(User_1.default, "findOne").resolves(null);
            sinon_1.default.stub(bcryptjs_1.default, "hash").resolves("hashedPassword");
            sinon_1.default.stub(jsonwebtoken_1.default, "sign").resolves('token');
            await (0, auhtController_1.register)(req, res);
            (0, chai_1.expect)(statusStub.calledWith(201)).to.be.true;
            (0, chai_1.expect)(jsonStub.calledWith({ message: "User registered successfully", user: sinon_1.default.match.object })).to.be.true;
        });
    });
});
