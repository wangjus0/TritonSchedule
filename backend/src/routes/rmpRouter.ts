import express from "express";
import { connectToDB } from "../services/connectToDB.js";

const router = express.Router();

router.get("/", async (req, res) => {

  const db = await connectToDB();

  const queryParams = req.query;

  const teacher = typeof queryParams.teacher === "string" ? queryParams.teacher.trim() : "";

  const normalizedTeacher = teacher
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();

  const data = await db.collection("rmpData").find({
    nameKey: normalizedTeacher,
  }).toArray();

  if (data.length <= 0) {
    return res.status(404).send('Item not found');
  }

  return res.send({ Data: data });

});

export default router
