import express from "express";
import { connectToDB } from "../services/connectToDB.js";
const router = express.Router();
router.get("/", async (req, res) => {
    const db = await connectToDB();
    const queryParams = req.query;
    const term = typeof queryParams.term === "string" ? queryParams.term.trim() : "";
    const course = typeof queryParams.course === "string" ? queryParams.course.trim() : "";
    const query = {};
    if (course.length > 0) {
        const safeCourse = course
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // escape regex chars
            .replace(/\s+/g, "\\s+"); // allow flexible spaces
        query.Name = { $regex: safeCourse, $options: "i" };
    }
    if (term.length > 0) {
        const safeTerm = term
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\s+/g, "\\s+");
        query.Term = { $regex: safeTerm, $options: "i" };
    }
    const queryResults = await db.collection("courses").find(query).toArray();
    if (queryResults.length <= 0) {
        return res.status(404).send('Item not found');
    }
    return res.json({ data: queryResults });
});
export default router;
