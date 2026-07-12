import { markTermsInactive } from "../services/supabaseStore.js";

export async function markAllTermsInactive() {
  await markTermsInactive();
}
