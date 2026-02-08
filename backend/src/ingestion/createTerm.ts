import { connectToDB } from "../services/connectToDB.js";
import type { Term } from "../models/Term.js";

export async function createTerm(newTerm: string) {
  const db = await connectToDB();
  const terms = db.collection("terms");

  const newInsertTerm: Term = {
    Term: newTerm,
    IsActive: true,
  };

  await terms.insertOne(newInsertTerm);

  return;
}
