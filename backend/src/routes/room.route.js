import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  bankTransferController,
  createRoomController,
  getRoomController,
  joinRoomController,
  payCreditController,
  startGameController,
  transferAllController,
  transferController,
  useCreditController,
} from "../controllers/room.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createRoomController);
router.post("/join", protectRoute, joinRoomController);
router.post("/:id/start", protectRoute, startGameController);
router.get("/:id", protectRoute, getRoomController);

router.post("/:id/transfer", protectRoute, transferController);
router.post("/:id/transferall", protectRoute, transferAllController);
router.post("/:id/paycredit", protectRoute, payCreditController);
router.post("/:id/usecredit", protectRoute, useCreditController);
router.post("/:id/banktransfer", protectRoute, bankTransferController);

export default router;
