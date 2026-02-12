import dotenv from "dotenv";
import express from "express";

import courseRouter from "./routes/courseRouter.js";
import rmpRouter from "./routes/rmpRouter.js";
import refreshRouter from "./routes/refreshRouter.js";
import termRouter from "./routes/termRouter.js";
import { requireApiSecret } from "./middleware/requireApiSecret.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(requireApiSecret);

app.use("/course", courseRouter);
app.use("/rmp", rmpRouter);
app.use("/refresh", refreshRouter);
app.use("/term", termRouter);

export default app;
