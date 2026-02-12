import express from "express";
import { getActiveTerm } from "../controllers/getActiveTerm.js";

const router = express.Router();

router.get("/", getActiveTerm);

export default router;
