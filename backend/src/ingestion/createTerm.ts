import { upsertActiveTerm } from "../services/supabaseStore.js";

export async function createTerm(newTerm: string) {
  await upsertActiveTerm(newTerm);
}
