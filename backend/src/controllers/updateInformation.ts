import { ingest } from "../ingestion/ingest.js";
import { connectToDB } from "../services/connectToDB.js";
import type { Db } from "mongodb";
import type { Request, Response } from "express";

export async function updateInformation(req: Request, res: Response) {
  try {
    const db: Db = await connectToDB();

    const courseCollection = db.collection("courses");
    const rmpCollection = db.collection("rmpData");

    await courseCollection.deleteMany({}); // Delete all existing courses for updates
    await rmpCollection.deleteMany({}); // Delete all existing rmp data for updates

    await ingest(); // Updates

    return res.status(200).send({ message: "Courses updated" });
  } catch (error) {
    console.error("Error in updateInformation:", error);
    return res.status(500).send({ 
      error: "Failed to update courses", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
