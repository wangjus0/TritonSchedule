import type { WithId } from "mongodb";
import { connectToDB } from "./connectToDB.js";

type User = {
  name: string;
  password: string;
};

function getUsersCollectionName() {
  return "users";
}

export async function register(user: User) {

  const db = await connectToDB();
  const usersCollection = db.collection<User>(getUsersCollectionName());

  try {
    const existing = await usersCollection.findOne({ name: user.name });
    if (existing) {
      throw new Error("User already exists");
    }

    await usersCollection.insertOne({
      name: user.name,
      password: user.password,
    });
  } catch (error) {
    throw error;
  }

}

export async function login(user: User): Promise<WithId<User> | null> {

  const db = await connectToDB();
  const usersCollection = db.collection<User>(getUsersCollectionName());

  try {
    const foundUser = await usersCollection.findOne({
      name: user.name,
      password: user.password
    });
    return foundUser;
  } catch (error) {
    throw error;
  }

}

