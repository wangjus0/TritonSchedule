import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import courseRouter from "./routes/courseRouter.js";
import rmpRouter from "./routes/rmpRouter.js";
import adminRouter from "./routes/adminRouter.js";
import termRouter from "./routes/termRouter.js";
import healthRouter from "./routes/healthRouter.js";
import { requireAdmin } from "./middleware/requireAdmin.js";

// Only load .env file in development (Vercel uses environment variables configured in dashboard)
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ quiet: true });
}

const app = express();

const corsOptions = {
  origin: [
    "https://tritonschedule.com",
    "https://triton-schedule-alpha.vercel.app",
    "https://triton-schedule-jl29ml1fz-justin-wangs-projects-e5966906.vercel.app",
    "http://localhost:8080",
  ],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/course", requireAdmin, courseRouter);
app.use("/rmp", requireAdmin, rmpRouter);
app.use("/admin", requireAdmin, adminRouter);
app.use("/term", requireAdmin, termRouter);
app.use("/health", requireAdmin, healthRouter);

export default app;

