import { connectToSupabase } from "../services/supabase.js";
import { ingest } from "../ingestion/ingest.js";

export async function updateInformation(req: any, res: any) {
  const supabase = await connectToSupabase();

  // Delete all courses (clear entire table)
  const { error: coursesError } = await supabase
    .from('courses')
    .delete()
    .not('id', 'is', null);

  if (coursesError) {
    console.error('Error clearing courses:', coursesError);
  }

  // Delete all rmp_data
  const { error: rmpError } = await supabase
    .from('rmp_data')
    .delete()
    .not('id', 'is', null);

  if (rmpError) {
    console.error('Error clearing rmp_data:', rmpError);
  }

  await ingest();

  return res.status(200).send({ message: "Courses updated" });
}
