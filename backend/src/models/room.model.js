import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },

    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
      },
    ],

    bankerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    initialAmount: {
      type: Number,
      required: true,
    },

    gameStarted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Room", roomSchema);
