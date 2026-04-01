import { disconnectFromSupabase } from "./supabase.js";

export async function disconnectFromDB() {
  await disconnectFromSupabase();
}
