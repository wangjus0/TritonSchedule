import express from "express";
import path from "path";
import cors from "cors";
import { connectDB } from "../db/mongo.js";
export const app = express();
// Enable CORS for all routes
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
// Middleware for parsing JSON
app.use(express.json());
// Intial page rendering (rest by react)
app.get("/", (req, res) => {
    const resource = path.resolve(process.cwd(), "..", "frontend", "index.html");
    res.sendFile(resource);
});
// Move this route into a course routing specific file 
// and remove the function and create a course controller function for it
app.get("/api/courses", async (req, res) => {
    try {
        const { search, term } = req.query;
        // Validate query parameters
        if (!search || !term) {
            return res.status(400).json({
                error: "Missing required query parameters",
                message: "Both 'search' and 'term' query parameters are required",
                example: "/api/courses?search=cse11&term=WI26"
            });
        }
        const db = await connectDB();
        const courses = db.collection("courses");
        const searchQuery = String(search);
        console.log(`Searching for courses with query: "${searchQuery}" and term: "${term}"`);
        const content = await courses
            .find({ name: { $regex: searchQuery, $options: "i" } })
            .toArray();
        console.log(`Found ${content.length} courses matching "${searchQuery}"`);
        // Serialize MongoDB documents to plain objects to avoid circular references
        const serializedContent = content.map(doc => ({
            _id: doc._id?.toString(),
            name: doc.name,
            sections: doc.sections || []
        }));
        // Setting origin headers
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5174');
        // Return the results
        res.json(serializedContent);
    }
    catch (error) {
        console.error("Error searching for courses:", error);
        res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "An unknown error occurred"
        });
    }
});
