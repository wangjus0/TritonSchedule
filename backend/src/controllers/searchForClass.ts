import { searchCourses } from "../services/supabaseRepository.js";

export async function searchForClass(req: any, res: any) {

  const queryParams = req.query;

  const term = typeof queryParams.term === "string" ? queryParams.term.trim() : "";
  const course = typeof queryParams.course === "string" ? queryParams.course.trim() : "";

  const queryResults = await searchCourses(course, term);

  return res.json({ data: queryResults });
}
