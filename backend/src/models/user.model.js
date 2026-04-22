import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  name: String,

  socketId: String,

  balance: {
    type: Number,
    default: 0,
    min: 0,
  },

  creditUsed: {
    type: Number,
    default: 0,
    min: 0,
    max: 10000,
  },

  isBanker: {
    type: Boolean,
    default: false,
  },
});

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },

    players: [playerSchema], 
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    bankerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isBankerAlsoPlayer: {
      type: Boolean,
      default: true,
    },

    initialAmount: {
      type: Number,
      default: 0,
    },

    gameStarted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);