import express from "express";
import { updateInformation } from "../controllers/updateInformation.js";

const router = express.Router();

router.get("/refresh", updateInformation);

export default router
