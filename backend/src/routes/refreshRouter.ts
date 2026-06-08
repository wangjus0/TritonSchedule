import express from "express";
import { updateInformation } from "../controllers/updateInformation.js";
import { refreshRateLimiter } from "../middleware/rateLimitRefresh.js";

const router = express.Router();

router.get("/", refreshRateLimiter, updateInformation);

export default router;
