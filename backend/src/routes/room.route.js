import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  bankTransferController,
  createRoomController,
  getRoomController,
  joinRoomController,
  leaveRoomController,
  payCreditController,
  rejoinRoomController,
  startGameController,
  transferAllController,
  transferController,
  useCreditController,
} from "../controllers/room.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createRoomController);
router.post("/join", protectRoute, joinRoomController);
router.post("/:id/start", protectRoute, startGameController);
router.post("/:id/rejoin", protectRoute, rejoinRoomController);
router.get("/:id", protectRoute, getRoomController);

router.post("/:id/transfer", protectRoute, transferController);
router.post("/:id/transferall", protectRoute, transferAllController);
router.post("/:id/paycredit", protectRoute, payCreditController);
router.post("/:id/usecredit", protectRoute, useCreditController);
router.post("/:id/banktransfer", protectRoute, bankTransferController);
router.post("/:id/leave", protectRoute, leaveRoomController);

export default router;
