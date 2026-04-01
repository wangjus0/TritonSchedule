import { connectToSupabase } from "../services/supabase.js";

export async function markAllTermsInactive() {
  const supabase = await connectToSupabase();

  const { error } = await supabase
    .from('terms')
    .update({ is_active: false })
    .not('id', 'is', null);

  if (error) {
    console.error('Error marking all terms inactive:', error);
    throw error;
  }

  return;
}
