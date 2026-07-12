import { getActiveTerm } from "../services/supabaseStore.js";

export async function getActiveTermFromDB() {
  return getActiveTerm();
}
