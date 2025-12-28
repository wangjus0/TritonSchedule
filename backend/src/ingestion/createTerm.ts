import { connectDB } from "../db/mongo.js";
import type { term } from "../models/Term.js";

export async function createTerm(newTerm: string) {
  const db = await connectDB();
  const terms = db.collection<term>("terms");

  const newInsertTerm: term = {
    term: newTerm,
    isActive: true,
  };

  await terms.insertOne(newInsertTerm);
}
