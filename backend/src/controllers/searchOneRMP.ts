import { searchProfessor } from "../services/supabaseRepository.js";
import { normalizeTeacherKey } from "../utils/normalizeTeacherKey.js";

export async function searchOneRMP(req: any, res: any) {

  const queryParams = req.query;

  if (queryParams.teacher == null) {
    const data = await searchProfessor();
    return res.send({ Data: data });
  }

  const teacher = typeof queryParams.teacher === "string" ? queryParams.teacher.trim() : "";

  const normalized = normalizeTeacherKey(teacher);

  const data = await searchProfessor(normalized);

  if (data.length <= 0) {
    return res.status(404).send('Item not found');
  }

  return res.send({ Data: data });

}
