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

// ─── In-memory disconnect grace timers ───
// Key: `userId` string → { timerId, roomId }
const disconnectTimers = new Map();

// Grace period before a disconnected player is actually removed (ms)
const DISCONNECT_GRACE_MS = 30_000;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", async ({ roomId, userId }) => {
    try {
      socket.join(roomId);

      // Store on socket object so disconnect handler can use it reliably
      socket.data = { roomId, visitorId: userId };

      // ─── Cancel pending disconnect timer (reconnection) ───
      const timerKey = `${userId}`;
      let isReconnection = false;
      if (disconnectTimers.has(timerKey)) {
        const pending = disconnectTimers.get(timerKey);
        clearTimeout(pending.timerId);
        disconnectTimers.delete(timerKey);
        isReconnection = true;
        console.log(
          `Reconnect: cancelled disconnect timer for user=${userId} room=${roomId}`,
        );
      }

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

          if (isReconnection) {
            // Player was disconnected and came back within the grace period
            socket.to(roomId).emit("player_reconnected", { name: playerName });
          } else {
            // Fresh join (new player or page load)
            socket.to(roomId).emit("player_joined", { name: playerName });
          }
        }

        // Send fresh room state to the connecting client
        socket.emit("room_updated", room);
      }
    } catch (error) {
      console.error("Error in join_room socket", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    // Use stored data instead of relying on DB socketId lookup
    const { roomId, visitorId: userId } = socket.data || {};
    if (!roomId || !userId) {
      console.log("disconnect: no room/user data on socket, skipping");
      return;
    }

    console.log(
      `disconnect: starting ${DISCONNECT_GRACE_MS / 1000}s grace timer for user=${userId} room=${roomId}`,
    );

    // ─── Start grace period timer ───
    const timerKey = `${userId}`;

    // If there's already a pending timer (e.g. rapid disconnect/reconnect), clear it
    if (disconnectTimers.has(timerKey)) {
      clearTimeout(disconnectTimers.get(timerKey).timerId);
    }

    const timerId = setTimeout(async () => {
      disconnectTimers.delete(timerKey);

      console.log(
        `Grace expired: removing user=${userId} from room=${roomId}`,
      );

      try {
        const room = await roomModel.findOne({ roomId });

        if (!room) {
          console.log(`disconnect: room ${roomId} not found`);
          return;
        }

        // Find player by userId (reliable) instead of socketId (fragile)
        const disconnectedPlayer = room.players.find(
          (p) => p.userId.toString() === userId,
        );

        if (!disconnectedPlayer) {
          console.log(`disconnect: player ${userId} not in room ${roomId}`);
          return;
        }

        const disconnectedName = disconnectedPlayer.name || "A player";

        // Remove player by userId
        room.players = room.players.filter(
          (p) => p.userId.toString() !== userId,
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

        console.log(
          `disconnect: ${disconnectedName} removed from room ${roomId}, ${room.players.length} players left`,
        );
      } catch (error) {
        console.error("Error in disconnect grace handler", error);
      }
    }, DISCONNECT_GRACE_MS);

    disconnectTimers.set(timerKey, { timerId, roomId });
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
