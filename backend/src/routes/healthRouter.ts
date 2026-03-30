import express from "express";
import * as healthController from "../controllers/healthController.js";

const router = express.Router();

router.get("/", (req, res) => healthController.checkHealth(req, res));

export default router
