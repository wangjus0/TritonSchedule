import { insertTerm } from "../services/insertDB.js";
import type { Term } from "../models/Term.js";

export async function createTerm(newTerm: string) {
  const term: Term = {
    Term: newTerm,
    IsActive: true,
  };

  await insertTerm(term);
  return;
}
