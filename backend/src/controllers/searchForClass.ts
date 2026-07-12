import { searchCourses } from "../services/supabaseStore.js";
import type { Request, Response } from 'express';

export async function searchForClass(req: Request, res: Response) {
  const queryParams = req.query;

  const term = typeof queryParams.term === "string" ? queryParams.term.trim() : "";
  const course = typeof queryParams.course === "string" ? queryParams.course.trim() : "";

  const queryResults = await searchCourses(course, term);

  return res.json({ data: queryResults });
}
