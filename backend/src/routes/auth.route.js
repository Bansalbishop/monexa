import express from "express";
import {
  signupController,
  loginController,
  logoutController,
  changeprofileController,
  checkAuth,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/signup", signupController);
router.post("/login", loginController);
router.post("/logout", logoutController);
router.put("/changeprofile", protectRoute, changeprofileController);
router.get("/check", protectRoute, checkAuth);

export default router;
