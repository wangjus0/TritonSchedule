import { createTermRow } from "../services/supabaseRepository.js";

export async function createTerm(newTerm: string) {
  await createTermRow(newTerm);
  return;
}
