import express from "express";
import { getProfile } from "../controllers/authController.js";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken.js";

const router = express.Router();

router.get("/profile", verifySupabaseToken, getProfile);

export default router;
