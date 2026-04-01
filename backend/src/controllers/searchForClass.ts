import { connectToSupabase } from "../services/supabase.js";

export async function searchForClass(req: any, res: any) {
  const supabase = await connectToSupabase();
  const queryParams = req.query;

  const term = typeof queryParams.term === "string" ? queryParams.term.trim() : "";
  const course = typeof queryParams.course === "string" ? queryParams.course.trim() : "";

  let dbQuery = supabase
    .from('courses')
    .select('*');

  if (course.length > 0) {
    const pattern = `%${course}%`;
    dbQuery = dbQuery.ilike('name', pattern);
  }

  if (term.length > 0) {
    const termPattern = `%${term}%`;
    dbQuery = dbQuery.ilike('term', termPattern);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Error searching courses:', error);
    return res.status(500).json({ error: 'Database query failed' });
  }

  return res.json({ data: data || [] });
}
