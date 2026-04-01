import { connectToSupabase } from "../services/supabase.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

export async function searchOneRMP(req: any, res: any) {
  const supabase = await connectToSupabase();
  const queryParams = req.query;

  if (queryParams.teacher == null) {
    const { data, error } = await supabase
      .from('rmp_data')
      .select('*');

    if (error) {
      console.error('Error fetching all RMP data:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    return res.send({ Data: data || [] });
  }

  const teacher = typeof queryParams.teacher === "string" ? queryParams.teacher.trim() : "";
  const normalized = normalizeTeacherKey(teacher);

  const { data, error } = await supabase
    .from('rmp_data')
    .select('*')
    .eq('name_key', normalized);

  if (error) {
    console.error('Error searching RMP data:', error);
    return res.status(500).json({ error: 'Database query failed' });
  }

  if ((data || []).length <= 0) {
    return res.status(404).send('Item not found');
  }

  return res.send({ Data: data });
}
