import { ingest } from "../ingestion/ingest.js";
import { clearCourseCatalog } from "../services/supabaseStore.js";

export async function updateInformation(req: any, res: any) {
  await clearCourseCatalog();
  await ingest(); // Updates 

  return res.status(200).send({ message: "Courses updated" });
}
