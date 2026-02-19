import type { HydratedDocument } from "mongoose";
import type { User } from "../models/Users.js";
import { UserModel } from "../models/Users.js";

export async function register(user: HydratedDocument<User>) {

  try {
    await UserModel.create(user);
  } catch (error) {
    throw error;
  }

}

export async function login(user: HydratedDocument<User>) {

  try {
    const foundUser = await UserModel.findOne({
      name: user.name,
      password: user.password
    });
    return foundUser;
  } catch (error) {
    throw error;
  }

}


