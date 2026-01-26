import { connectToDB } from "../db/connectToDB.js";
import { disconnectFromDB } from "../db/disconnectFromDB.js";

export async function getActiveTermFromDB() {
  const db = await connectToDB();

  // Check if there are any collections created already
  const collectionExists = await db.listCollections().toArray();
  const exist = collectionExists.length > 0;

  if (!exist) {
    return null;
  }

  // Opens the terms collection -> filters for active term
  const termsCollection = db.collection("terms");
  const currentTerm = await termsCollection.findOne({ IsActive: true });

  console.log("Retrieved Active Term from DB");

  await disconnectFromDB();

  console.log(currentTerm);

  return currentTerm;
}
