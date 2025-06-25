import { createClient } from "redis";

const redisClinet = createClient({
  socket: {
    host: "127.0.0.1",
    port: 6380,
  },
});

redisClinet.on("error", (err) => console.log("Redis Client Error ==> ", err));

redisClinet
  .connect()
  .catch((err) => console.log("Error connecting to redis", err));

export default redisClinet;
