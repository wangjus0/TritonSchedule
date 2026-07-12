import type { RequestHandler } from "express";

export const requireAdmin: RequestHandler = (req, res, next) => {
  const expected = process.env.API_KEY;
  const apiKey = req.get("x-api-key");

  if (!expected || apiKey !== expected) {
    res.status(401).send({ message: "Not Authorized" });
    return;
  }

  next();
};
