import { connectToDB } from "../db/connectToDB.js";
import type { term } from "../models/Term.js";

export async function getActiveTermFromDB() {
  const db = await connectToDB();

  const collectionExists = await db.listCollections().toArray();
  const exist = collectionExists.length > 0;

  if (!exist) {
    return null;
  }

  const terms = await db.collection<term>("terms");
  const currentTerm = terms.findOne({ isActive: true });

  return currentTerm;
}
