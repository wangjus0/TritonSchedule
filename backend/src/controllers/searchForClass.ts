import { connectToDB } from "../services/connectToDB.js";
import type { Db } from "mongodb";

export async function searchForClass(req: any, res: any) {

  const db: Db = await connectToDB();

  const queryParams = req.query;

  const term = typeof queryParams.term === "string" ? queryParams.term.trim() : "";
  const course = typeof queryParams.course === "string" ? queryParams.course.trim() : "";

  const query: any = {};

  if (course.length > 0) {
    const safeCourse = course
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // escape regex chars
      .replace(/\s+/g, "\\s+"); // allow flexible spaces
    query.Name = { $regex: safeCourse, $options: "i" };
  }

  if (term.length > 0) {
    const safeTerm = term
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    query.Term = { $regex: safeTerm, $options: "i" };
  }

  const queryResults = await db.collection("courses").find(query).toArray();

  return res.json({ data: queryResults });
}
