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
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

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

      // Store on socket object so disconnect handler can use it reliably
      socket.data = { roomId, userId };

      // Update socketId in DB (Mongoose auto-casts userId string to ObjectId)
      const result = await roomModel.updateOne(
        { roomId, "players.userId": userId },
        { $set: { "players.$.socketId": socket.id } }
      );

      console.log(`join_room: user=${userId} room=${roomId} socket=${socket.id} matched=${result.modifiedCount}`);

      // Get player name for notification
      const room = await roomModel
        .findOne({ roomId })
        .populate("players.userId", "fullname profilePic");

      if (room) {
        const player = room.players.find(
          (p) => p.userId?._id?.toString() === userId
        );
        if (player) {
          socket.to(roomId).emit("player_joined", {
            name: player.userId?.fullname || player.name,
          });
        }
      }
    } catch (error) {
      console.error("Error in join_room socket", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    // Use stored data instead of relying on DB socketId lookup
    const { roomId, userId } = socket.data || {};
    if (!roomId || !userId) {
      console.log("disconnect: no room/user data on socket, skipping");
      return;
    }

    try {
      const room = await roomModel.findOne({ roomId });

      if (!room) {
        console.log(`disconnect: room ${roomId} not found`);
        return;
      }

      // Find player by userId (reliable) instead of socketId (fragile)
      const disconnectedPlayer = room.players.find(
        (p) => p.userId.toString() === userId
      );

      if (!disconnectedPlayer) {
        console.log(`disconnect: player ${userId} not in room ${roomId}`);
        return;
      }

      const disconnectedName = disconnectedPlayer.name || "A player";

      // Remove player by userId
      room.players = room.players.filter(
        (p) => p.userId.toString() !== userId
      );

      // If room is now empty, delete it
      if (room.players.length === 0) {
        await roomModel.deleteOne({ _id: room._id });
        console.log(`Room ${roomId} deleted (empty)`);
        return;
      }

      // If disconnected player was host, reassign
      if (room.hostId.toString() === userId) {
        room.hostId = room.players[0].userId;
      }

      // If disconnected player was banker, reassign
      if (room.bankerId && room.bankerId.toString() === userId) {
        room.bankerId = room.players[0].userId;
        room.players[0].isBanker = true;
      }

      await room.save();

      // Send updated room to remaining players
      const updatedRoom = await roomModel
        .findOne({ roomId })
        .populate("players.userId", "fullname profilePic");

      io.to(roomId).emit("room_updated", updatedRoom);

      io.to(roomId).emit("player_left", {
        name: disconnectedName,
      });

      console.log(`disconnect: ${disconnectedName} removed from room ${roomId}, ${room.players.length} players left`);
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
