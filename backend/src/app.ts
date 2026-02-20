import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import path from "path";
import courseRouter from "./routes/courseRouter.js";
import rmpRouter from "./routes/rmpRouter.js";
import refreshRouter from "./routes/refreshRouter.js";
import termRouter from "./routes/termRouter.js";
import { requireApiSecret } from "./middleware/requireApiSecret.js";

// Only load .env file in development (Vercel uses environment variables configured in dashboard)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

const allowedOrigins = [
  "https://tritonschedule.com",
  "https://triton-schedule-alpha.vercel.app",
  "https://triton-schedule-jl29ml1fz-justin-wangs-projects-e5966906.vercel.app/",
  "http://localhost:8080",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.use(requireApiSecret);

app.use("/course", courseRouter);
app.use("/rmp", rmpRouter);
app.use("/refresh", refreshRouter);
app.use("/term", termRouter);

export default app;
