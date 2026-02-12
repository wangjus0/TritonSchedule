import dotenv from "dotenv";
<<<<<<< HEAD
import cors from "cors";
=======
>>>>>>> 351a7f1 (fixing rmp controller for no query params)
import express from "express";
import courseRouter from "./routes/courseRouter.js";
import rmpRouter from "./routes/rmpRouter.js";
import refreshRouter from "./routes/refreshRouter.js";
import termRouter from "./routes/termRouter.js";
import { requireApiSecret } from "./middleware/requireApiSecret.js";
dotenv.config();
const app = express();
<<<<<<< HEAD
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
=======
>>>>>>> 351a7f1 (fixing rmp controller for no query params)
app.use(express.json());
app.use(requireApiSecret);
app.use("/course", courseRouter);
app.use("/rmp", rmpRouter);
app.use("/refresh", refreshRouter);
app.use("/term", termRouter);
export default app;
