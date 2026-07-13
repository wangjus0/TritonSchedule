import { getActiveTermFromDB } from "../ingestion/getActiveTermFromDB.js";

export async function getActiveTerm(req: any, res: any) {
	const currentTerm = await getActiveTermFromDB();

	if (!currentTerm) {
		return res.status(200).json({ Term: "" });
	}

	const term =
		typeof currentTerm.Term === "string" ? currentTerm.Term.trim() : "";
	return res.status(200).json({ Term: term });
}
