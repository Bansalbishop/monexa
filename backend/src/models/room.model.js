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
const transactionSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);
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
    transactions: {
      type: [transactionSchema],
      default: [],
    },
    bankerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    bankBalance:{
      type:Number,
      required:true,
      min:0,
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
  { timestamps: true },
);

export default mongoose.model("Room", roomSchema);
