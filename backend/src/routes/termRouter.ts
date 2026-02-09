import express from "express";
import { getActiveTermFromDB } from "../ingestion/getActiveTermFromDB.js";

const router = express.Router();

router.get("/", async (req, res) => {

  const currentTerm = await getActiveTermFromDB();

  if (currentTerm == null) {
    return res.status(404).send("Item not found");
  }

  return res.json({ Term: currentTerm });

})

export default router
