import type { Request, Response } from 'express';
import * as userServices from "../services/userServices.js";

export const loginOne = async (req: Request, res: Response) => {

  try {
    const foundUser = await userServices.login(req.body);
    res.status(200).send(foundUser);
  } catch (error) {
    throw error;
  }

}

export const registerOne = async (req: Request, res: Response) => {

  try {
    await userServices.register(req.body);
    res.status(200).send("Account Registered");
  } catch (error) {
    return res.status(500).send(error);
  }

}
