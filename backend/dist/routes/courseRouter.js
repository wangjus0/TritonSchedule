import express from "express";
import { connectToDB } from "../services/connectToDB.js";
const router = express.Router();
router.get("/", async (req, res) => {
    const db = await connectToDB();
    const queryParams = req.query;
    const term = typeof queryParams.term === "string" ? queryParams.term : undefined;
    const course = typeof queryParams.course === "string" ? queryParams.course : undefined;
    // const queryResults = await db.collection('courses').find({ Name: course, Term: term }).toArray();
    const queryResults = await db.collection('courses').find({ Name: { $regex: course, $options: "i" } }).toArray();
    if (queryResults.length <= 0) {
        res.status(404).send('Item not found');
    }
    res.json({ data: queryResults });
});
export default router;
