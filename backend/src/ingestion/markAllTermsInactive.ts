import { markAllTermRowsInactive } from "../services/supabaseRepository.js";

export async function markAllTermsInactive() {
  await markAllTermRowsInactive();
  return;
}
