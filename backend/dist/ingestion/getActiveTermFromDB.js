import { connectToDB } from "../services/connectToDB.js";
import { disconnectFromDB } from "../services/disconnectFromDB.js";
export async function getActiveTermFromDB() {
    const db = await connectToDB();
    // Check if there are any collections created already
    const collectionExists = await db.listCollections().toArray();
    const exist = collectionExists.length > 0;
    if (!exist) {
        return null;
    }
    const termsCollection = db.collection("terms");
    const currentTerm = await termsCollection.findOne({ IsActive: true });
    return currentTerm;
}
