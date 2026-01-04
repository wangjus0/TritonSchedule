import { connectToDB } from "../db/connectToDB.js";
import type { term } from "../models/Term.js";

export async function createTerm(newTerm: string) {
  const db = await connectToDB();
  const terms = db.collection<term>("terms");

  const newInsertTerm: term = {
    Type: "Term",
    Term: newTerm,
    IsActive: true,
  };

  await terms.insertOne(newInsertTerm);
}
