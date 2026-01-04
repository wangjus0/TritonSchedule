import { connectToDB } from "../db/connectToDB.js";
import type { term } from "../models/Term.js";

async function markAllTermsInactive() {
  const db = await connectToDB();
  const terms = db.collection<term>("terms");

  const collectionExists = await db.listCollections().toArray();
  const exists = collectionExists.length > 0;

  if (!exists) {
    throw new Error("Collection does not exists");
  }

  terms.updateMany({}, { $set: { isActive: false } });
}
