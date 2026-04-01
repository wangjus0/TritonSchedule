import express from "express";
import { updateInformation } from "../controllers/updateInformation.js";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken.js";

const router = express.Router();

router.get("/", verifySupabaseToken, updateInformation);

export default router
