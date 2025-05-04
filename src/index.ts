import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
dotenv.config();


import "./cron/scheduler";

import morgan from "morgan";
import cors from "cors";

import { connectDb } from "./config/database";

import { Error } from "mongoose";
import bookigRouter from "./routers/bookingRouter";
import authRouter from "./routers/authRouter";
import adminRouter from "./routers/adminRouter";
import driverRoute from "./routers/driverRoute";

const PORT = process.env.PORT;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",                                     
  },
})
connectDb();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.log(err.stack);
  res.status(500).json({ err: "something went working!" });
});

app.get("/", (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      message: "Welcome to the Salmon arm taxi API",
    });
  } catch (error) {
    // next(error);
    console.log("error ==> ", error);
  }
}
);

app.use("/customer", bookigRouter);
app.use("/api/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/api/driver", driverRoute);



io.on("connection", (socket) =>{
  // console.log("Client connected: ", socket.id);

  const sentTime = () =>{
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Vancouver', // ✅ IST
    });
    socket.emit("serverTime", currentTime);
  }

  const interval = setInterval(sentTime,1000);

  socket.on("disconnect", () =>{
    // console.log("Client disconnected", socket.id);
    clearInterval(interval);
  })
})

server.listen(PORT, () => {
  console.log(`server is listen on http://localhost:${PORT}`);
});
