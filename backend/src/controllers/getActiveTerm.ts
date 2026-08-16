import { getActiveTermRow } from "../services/supabaseRepository.js";

export async function getActiveTerm(req: any, res: any) {
  const currentTerm = await getActiveTermRow();

  if (!currentTerm) {
    return res.status(404).send({ message: "No active term found" });
  }

  return res.status(200).json({ Term: currentTerm.Term });
}
