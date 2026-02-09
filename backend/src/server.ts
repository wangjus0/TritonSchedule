import dotenv from "dotenv";
import express from "express";
import path from "path";

import courseRouter from "./routes/courseRouter.js";
import termRouter from "./routes/termRouter.js";
import rmpRouter from "./routes/rmpRouter.js";

// TODO: I need to fix rmpUpdate() for some reason it's not searching some teachers up when there profile exists

export const app = express(); // Set up express app

dotenv.config(); // Initialize .env variables

const PORT = 3000;

app.use(express.json()); // Json middleware

app.get("/", (req, res) => { // Serve index.html
  const resource = path.resolve(process.cwd(), "..", "frontend", "index.html");
  res.sendFile(resource);
});

app.use("/course", courseRouter);

app.listen(PORT, () => {
  console.log('Server started');
});

app.use("/rmp", rmpRouter);

app.use("/term", termRouter);

