import roomModel from "../models/room.model.js";
import userModel from "../models/user.model.js";
import { io } from "../server.js";

const isDecimalAmount = (value) => {
  const parsed = Number(value);
  return !Number.isNaN(parsed) && !Number.isInteger(parsed);
};

const applyDecimalPenalty = (player) => {
  player.balance = Math.max((player.balance || 0) - 2000, 0);
};

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
};

export const createRoomController = async (req, res) => {
  try {
    let roomId = generateCode();

    // ensure unique
    while (await roomModel.findOne({ roomId })) {
      roomId = generateCode();
    }

    const user = await userModel.findById(req.user._id);

    const player = {
      userId: user._id,
      name: user.fullname,
      socketId: "",
      balance: 0,
      creditUsed: 0,
      isBanker: true,
    };

    const room = await roomModel.create({
      roomId,
      hostId: user._id,
      bankBalance: 0,
      bankerId: user._id,
      players: [player],
      gameStarted: false,
    });
    const populatedRoom = await roomModel
      .findOne({ roomId })
      .populate("players.userId", "fullname profilePic");

    io.to(roomId).emit("room_updated", populatedRoom);

    res.status(201).json({
      message: "Room created",
      roomId: populatedRoom.roomId,
      room: populatedRoom,
    });
  } catch (error) {
    console.error("Error in create room controller", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const joinRoomController = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    const room = await roomModel.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const alreadyJoined = room.players.find(
      (p) => p.userId.toString() === req.user._id.toString(),
    );

    if (alreadyJoined) {
      // Player is reconnecting after refresh — return room data instead of error
      const populatedRoom = await roomModel
        .findOne({ roomId })
        .populate("players.userId", "fullname profilePic");
      return res.status(200).json({
        message: "Reconnected to room",
        room: populatedRoom,
      });
    }

    const user = await userModel.findById(req.user._id);

    const newPlayer = {
      userId: user._id,
      name: user.fullname,
      socketId: "",
      balance: 0,
      creditUsed: 0,
      isBanker: false,
    };

    room.players.push(newPlayer);

    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId })
      .populate("players.userId", "fullname profilePic");

    io.to(roomId).emit("room_updated", populatedRoom);

    res.status(200).json({
      message: "Joined room",
      room: populatedRoom, // ✅ FIXED
    });
  } catch (error) {
    console.error("Error in join room controller", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getRoomController = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    const populatedRoom = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");
    res.status(200).json({ room: populatedRoom });
  } catch (error) {
    console.error("Error in get room", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const rejoinRoomController = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isPlayerInRoom = room.players.find(
      (p) => p.userId?._id?.toString() === req.user._id.toString(),
    );

    if (!isPlayerInRoom) {
      return res.status(403).json({ message: "You are not in this room" });
    }

    return res.status(200).json({
      message: "Rejoined room",
      room,
    });
  } catch (error) {
    console.error("Error in rejoinRoomController", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const startGameController = async (req, res) => {
  try {
    const { id } = req.params;
    const { initialAmount, isBankerAlsoPlayer, bankBalance } = req.body;

    // validation
    if (
      !initialAmount ||
      !bankBalance ||
      bankBalance <= 0 ||
      initialAmount <= 0
    ) {
      return res.status(400).json({
        message: "Invalid details",
      });
    }

    const room = await roomModel.findOne({ roomId: id });

    if (!room) {
      return res.status(404).json({ message: "Room does not exist" });
    }
    if (room.gameStarted) {
      return res.status(400).json({ message: "Game already started" });
    }
    // only host can start
    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only host can start the game",
      });
    }

    // update room
    room.initialAmount = initialAmount;
    room.gameStarted = true;
    room.isBankerAlsoPlayer = isBankerAlsoPlayer;
    room.bankBalance = bankBalance;

    // distribute money
    room.players.forEach((p) => {
      if (p.isBanker && !isBankerAlsoPlayer) return;
      p.balance = initialAmount;
    });

    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId: room.roomId })
      .populate("players.userId", "fullname profilePic");

    io.to(room.roomId).emit("room_updated", populatedRoom);
    io.to(room.roomId).emit("game_started", populatedRoom);

    return res.status(200).json({
      message: "Game started",
      room,
    });
  } catch (error) {
    console.error("Error in startGameController", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const transferController = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromId, toId, amount } = req.body;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    if (fromId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    if (fromId === toId) {
      return res.status(400).json({ message: "Cannot send to yourself" });
    }

    const room = await roomModel.findOne({ roomId: id });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const sender = room.players.find((p) => p.userId.toString() === fromId);
    const receiver = room.players.find((p) => p.userId.toString() === toId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Player not found" });
    }

    if (isDecimalAmount(parsedAmount)) {
<<<<<<< HEAD
      const floored = Math.floor(parsedAmount);

      if (!floored || floored <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid amount after flooring" });
      }

      const totalDebit = floored + 2000; // floored amount + decimal fee

      if (sender.balance < totalDebit) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      sender.balance -= totalDebit;
      receiver.balance += floored;

      room.transactions.push({
        senderId: sender.userId,
        receiverId: receiver.userId,
        amount: floored,
      });

=======
      applyDecimalPenalty(sender);
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
      await room.save();

      const populatedRoom = await roomModel
        .findOne({ roomId: id })
        .populate("players.userId", "fullname profilePic");

      io.to(id).emit("room_updated", populatedRoom);
      return res.status(200).json({
<<<<<<< HEAD
        message: `Decimal amount floored to ${floored} and 2000 charged`,
        room: populatedRoom,
=======
        message: "Decimal amount penalty applied",
        silent: true,
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
      });
    }

    if (sender.balance < parsedAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= parsedAmount;
    receiver.balance += parsedAmount;

    room.transactions.push({
      senderId: sender.userId,
      receiverId: receiver.userId,
      amount: parsedAmount,
    });
    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");

    io.to(id).emit("room_updated", populatedRoom);

    return res.status(200).json({
      message: "Transfer successful",
      room,
    });
  } catch (error) {
    console.error("Error in transferController", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const transferAllController = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromId, amount } = req.body;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    if (fromId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    const room = await roomModel.findOne({ roomId: id });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const sender = room.players.find((p) => p.userId.toString() === fromId);

    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    if (isDecimalAmount(parsedAmount)) {
<<<<<<< HEAD
      const floored = Math.floor(parsedAmount);

      if (!floored || floored <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid amount after flooring" });
      }

      const receivers = room.players.filter((p) => {
        if (p.userId.toString() === fromId) return false;
        if (!room.isBankerAlsoPlayer && p.isBanker) return false;
        return true;
      });

      const totalAmount = floored * receivers.length;
      const totalDebit = totalAmount + 2000; // charge one 2000 penalty for decimal

      if (sender.balance < totalDebit) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      sender.balance -= totalDebit;

      receivers.forEach((p) => {
        p.balance += floored;
      });

      room.transactions.push({
        senderId: sender.userId,
        receiverId: null,
        amount: floored,
      });

=======
      applyDecimalPenalty(sender);
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
      await room.save();

      const populatedRoom = await roomModel
        .findOne({ roomId: id })
        .populate("players.userId", "fullname profilePic");

      io.to(id).emit("room_updated", populatedRoom);
      return res.status(200).json({
<<<<<<< HEAD
        message: `Decimal amount floored to ${floored} per player and 2000 charged`,
        room: populatedRoom,
=======
        message: "Decimal amount penalty applied",
        silent: true,
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
      });
    }

    const receivers = room.players.filter((p) => {
      if (p.userId.toString() === fromId) return false;
      if (!room.isBankerAlsoPlayer && p.isBanker) return false;
      return true;
    });

    const totalAmount = parsedAmount * receivers.length;

    if (sender.balance < totalAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= totalAmount;

    receivers.forEach((p) => {
      p.balance += parsedAmount;
    });

    room.transactions.push({
      senderId: sender.userId,
      receiverId: null,
      amount: parsedAmount,
    });

    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");

    io.to(id).emit("room_updated", populatedRoom);

    return res.status(200).json({
      message: "Transfer to all successful",
      room,
    });
  } catch (error) {
    console.error("Error in transferAllController", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const payCreditController = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromId, amount } = req.body;
    const parsedAmount = Number(amount);

    if (fromId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const room = await roomModel.findOne({ roomId: id });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const player = room.players.find((p) => p.userId.toString() === fromId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    if (isDecimalAmount(parsedAmount)) {
<<<<<<< HEAD
      const floored = Math.floor(parsedAmount);

      if (!floored || floored <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid amount after flooring" });
      }

      if (player.creditUsed < floored) {
        return res.status(400).json({ message: "Repay exceeds credit used" });
      }

      const totalDebit = floored + 2000; // floored repay + penalty

      if (player.balance < totalDebit) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      player.balance -= totalDebit;
      player.creditUsed -= floored;

=======
      applyDecimalPenalty(player);
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
      await room.save();

      const populatedRoom = await roomModel
        .findOne({ roomId: id })
        .populate("players.userId", "fullname profilePic");

      io.to(id).emit("room_updated", populatedRoom);
      return res.status(200).json({
<<<<<<< HEAD
        message: `Decimal amount floored to ${floored} and 2000 charged`,
        room: populatedRoom,
      });
    }

    if (player.balance < parsedAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    if (player.creditUsed < parsedAmount) {
      return res.status(400).json({ message: "Repay exceeds credit used" });
    }

=======
        message: "Decimal amount penalty applied",
        silent: true,
      });
    }

    if (player.balance < parsedAmount) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    if (player.creditUsed < parsedAmount) {
      return res.status(400).json({
        message: "Repay exceeds credit used",
      });
    }

>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
    player.balance -= parsedAmount;
    player.creditUsed -= parsedAmount;

    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");

    io.to(id).emit("room_updated", populatedRoom);

    return res.status(200).json({
      message: "Credit repaid successfully",
      room,
    });
  } catch (error) {
    console.error("Error in repayCreditController", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const useCreditController = async (req, res) => {
  try {
    const { id } = req.params;
    const { toId, amount } = req.body;
    const parsedAmount = Number(amount);

    if (toId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const room = await roomModel.findOne({ roomId: id });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const player = room.players.find((p) => p.userId.toString() === toId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    if (isDecimalAmount(parsedAmount)) {
<<<<<<< HEAD
      const floored = Math.floor(parsedAmount);

      if (!floored || floored <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid amount after flooring" });
      }

      if (player.creditUsed + floored > 10000) {
        return res
          .status(400)
          .json({ message: "Insufficient balance in credit card" });
      }

      // apply penalty then credit the floored amount
      player.balance = Math.max((player.balance || 0) - 2000, 0);
      player.balance += floored;
      player.creditUsed += floored;

=======
      applyDecimalPenalty(player);
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
      await room.save();

      const populatedRoom = await roomModel
        .findOne({ roomId: id })
        .populate("players.userId", "fullname profilePic");

      io.to(id).emit("room_updated", populatedRoom);
      return res.status(200).json({
<<<<<<< HEAD
        message: `Decimal amount floored to ${floored} and 2000 charged`,
        room: populatedRoom,
      });
    }

    if (player.creditUsed + parsedAmount > 10000) {
      return res
        .status(400)
        .json({ message: "Insufficient balance in credit card" });
    }

=======
        message: "Decimal amount penalty applied",
        silent: true,
      });
    }

    if (player.creditUsed + parsedAmount > 10000) {
      return res.status(400).json({
        message: "Insufficient balance in credit card",
      });
    }

>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
    player.balance += parsedAmount;
    player.creditUsed += parsedAmount;

    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");

    io.to(id).emit("room_updated", populatedRoom);

    return res.status(200).json({
      message: "Credit Used successfully",
      room,
    });
  } catch (error) {
    console.error("Error in useCredit Controller", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const leaveRoomController = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await roomModel.findOne({ roomId: id });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const player = room.players.find(
      (p) => p.userId.toString() === req.user._id.toString(),
    );
    if (!player) {
      return res.status(403).json({ message: "You are not in this room" });
    }

    const playerName = player.name;
    room.players = room.players.filter(
      (p) => p.userId.toString() !== req.user._id.toString(),
    );

    if (room.players.length === 0) {
      await roomModel.deleteOne({ _id: room._id });
      io.to(id).emit("room_deleted");
      return res.status(200).json({ message: "Left room successfully" });
    }

    if (room.hostId.toString() === req.user._id.toString()) {
      room.hostId = room.players[0].userId;
    }

    if (room.bankerId?.toString() === req.user._id.toString()) {
      room.bankerId = room.players[0].userId;
      room.players[0].isBanker = true;
    }

    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");

    io.to(id).emit("room_updated", populatedRoom);
    io.to(id).emit("player_left", { name: playerName });

    return res.status(200).json({ message: "Left room successfully" });
  } catch (error) {
    console.error("Error in leaveRoomController", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const bankTransferController = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, amount } = req.body;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const room = await roomModel.findOne({ roomId: id });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (from !== "bank") {
      const sender = room.players.find((p) => p.userId.toString() === from);
      if (!sender) {
        return res.status(404).json({ message: "Player not found" });
      }

      if (isDecimalAmount(parsedAmount)) {
<<<<<<< HEAD
        const floored = Math.floor(parsedAmount);

        if (!floored || floored <= 0) {
          return res
            .status(400)
            .json({ message: "Invalid amount after flooring" });
        }

        const totalDebit = floored + 2000; // floored amount + penalty

        if (sender.balance < totalDebit) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        sender.balance -= totalDebit;
        room.bankBalance += floored;

        room.transactions.push({
          senderId: sender.userId,
          receiverId: null, // BANK
          amount: floored,
        });

=======
        applyDecimalPenalty(sender);
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
        await room.save();

        const populatedRoom = await roomModel
          .findOne({ roomId: id })
          .populate("players.userId", "fullname profilePic");

        io.to(id).emit("room_updated", populatedRoom);
        return res.status(200).json({
<<<<<<< HEAD
          message: `Decimal amount floored to ${floored} and 2000 charged`,
          room: populatedRoom,
=======
          message: "Decimal amount penalty applied",
          silent: true,
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
        });
      }

      if (sender.balance < parsedAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      sender.balance -= parsedAmount;
      room.bankBalance += parsedAmount;

      room.transactions.push({
        senderId: sender.userId,
        receiverId: null, // BANK
        amount: parsedAmount,
      });
    } else {
      const receiver = room.players.find((p) => p.userId.toString() === to);

      if (!receiver) {
        return res.status(404).json({ message: "Player not found" });
      }

<<<<<<< HEAD
      const amountToUse = isDecimalAmount(parsedAmount)
        ? Math.floor(parsedAmount)
        : parsedAmount;

      if (!amountToUse || amountToUse <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      if (room.bankBalance < amountToUse) {
        return res.status(400).json({ message: "Insufficient bank balance" });
      }

      room.bankBalance -= amountToUse;
      receiver.balance += amountToUse;
=======
      if (room.bankBalance < parsedAmount) {
        return res.status(400).json({ message: "Insufficient bank balance" });
      }

      room.bankBalance -= parsedAmount;
      receiver.balance += parsedAmount;
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447

      room.transactions.push({
        senderId: null, // BANK
        receiverId: receiver.userId,
<<<<<<< HEAD
        amount: amountToUse,
=======
        amount: parsedAmount,
>>>>>>> 6a51cfb04ba06889557511a1fe9d8c3674732447
      });
    }

    await room.save();

    const populatedRoom = await roomModel
      .findOne({ roomId: id })
      .populate("players.userId", "fullname profilePic");

    io.to(id).emit("room_updated", populatedRoom);
    return res.status(200).json({
      message: "Bank transfer successful",
      room,
    });
  } catch (error) {
    console.error("Error in bankTransferController", error);
    return res.status(500).json({ message: "Server error" });
  }
};
