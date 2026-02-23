import type { Request, Response } from "express";
import * as userServices from "../services/userServices.js";

export const loginOne = async (req: Request, res: Response) => {
  try {
    const foundUser = await userServices.login(req.body);
    res.status(200).send(foundUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("loginOne failed:", message);
    return res.status(500).send({ message });
  }
};

export const registerOne = async (req: Request, res: Response) => {
  try {
    await userServices.register(req.body);
    res.status(200).send("Account Registered");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("registerOne failed:", message);

    if (message === "User already exists") {
      return res.status(409).send({ message });
    }

    return res.status(500).send({ message });
  }
};
