"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const redisClinet = (0, redis_1.createClient)({
    socket: {
        host: "127.0.0.1",
        port: 6379,
    },
});
redisClinet.on("error", (err) => console.log("Redis Client Error ==> ", err));
redisClinet
    .connect()
    .catch((err) => console.log("Error connecting to redis", err));
exports.default = redisClinet;
