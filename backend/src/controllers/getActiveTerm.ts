import { getActiveTermFromDB } from "../ingestion/getActiveTermFromDB.js";

export async function getActiveTerm(req: any, res: any) {
  const currentTerm = await getActiveTermFromDB();

  if (!currentTerm) {
    return res.status(404).send({ message: "No active term found" });
  }

  return res.status(200).json({ Term: currentTerm.Term });
}
