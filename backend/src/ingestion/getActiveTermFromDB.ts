import { getActiveTerm } from "../services/insertDB.js";

export async function getActiveTermFromDB() {
  // Use the service function that queries Supabase
  return await getActiveTerm();
}
