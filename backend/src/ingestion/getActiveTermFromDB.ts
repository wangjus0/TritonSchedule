import { getActiveTermRow } from "../services/supabaseRepository.js";

export async function getActiveTermFromDB() {
  return getActiveTermRow();
}
