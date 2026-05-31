import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import roomRoutes from "./routes/room.route.js";
import roomModel from "./models/room.model.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

export { io };

// middleware
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);

// no removal on disconnect; preserve player state until explicit leave

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", async ({ roomId, userId }) => {
    try {
      socket.join(roomId);

      // Store on socket object so disconnect handler can use it reliably
      socket.data = { roomId, visitorId: userId };

      // Update socketId in DB (Mongoose auto-casts userId string to ObjectId)
      const result = await roomModel.updateOne(
        { roomId, "players.userId": userId },
        { $set: { "players.$.socketId": socket.id } },
      );

      console.log(
        `join_room: user=${userId} room=${roomId} socket=${socket.id} matched=${result.modifiedCount}`,
      );

      // Get player name for notification
      const room = await roomModel
        .findOne({ roomId })
        .populate("players.userId", "fullname profilePic");

      if (room) {
        const player = room.players.find(
          (p) => p.userId?._id?.toString() === userId,
        );
        if (player) {
          const playerName = player.userId?.fullname || player.name;
          socket.to(roomId).emit("player_reconnected", { name: playerName });
        }

        // Send fresh room state to the connecting client
        socket.emit("room_updated", room);
      }
    } catch (error) {
      console.error("Error in join_room socket", error);
    }
  });

  socket.on("leave_room", ({ roomId }) => {
    socket.leave(roomId);
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    const { roomId, visitorId: userId } = socket.data || {};
    if (!roomId || !userId) {
      console.log("disconnect: no room/user data on socket, skipping");
      return;
    }

    try {
      const room = await roomModel.findOne({ roomId });
      if (!room) {
        return;
      }

      const player = room.players.find((p) => p.userId.toString() === userId);
      if (!player) {
        return;
      }

      player.socketId = "";
      await room.save();

      const updatedRoom = await roomModel
        .findOne({ roomId })
        .populate("players.userId", "fullname profilePic");

      io.to(roomId).emit("room_updated", updatedRoom);
    } catch (error) {
      console.error("Error in disconnect handler", error);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
