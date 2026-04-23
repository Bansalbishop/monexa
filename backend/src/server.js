import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http"; // ✅ REQUIRED
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import roomRoutes from "./routes/room.route.js";
import roomModel from "./models/room.model.js";

dotenv.config();

const app = express();
const server = http.createServer(app); // ✅ create HTTP server
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
// ✅ attach socket to server
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", credentials: true },
});

export { io };

// middleware
app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", async ({ roomId, userId }) => {
    try {
      socket.join(roomId);

      const room = await roomModel.findOne({ roomId });

      if (!room) return;

      const player = room.players.find((p) => p.userId.toString() === userId);

      if (player) {
        player.socketId = socket.id;
        await room.save();
      }
    } catch (error) {
      console.error("Error in join_room socket", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    try {
      const room = await roomModel.findOne({
        "players.socketId": socket.id,
      });

      if (!room) return;

      const player = room.players.find((p) => p.socketId === socket.id);

      if (player) {
        player.socketId = "";
        await room.save();
      }
    } catch (error) {
      console.error("Error in disconnect socket", error);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
