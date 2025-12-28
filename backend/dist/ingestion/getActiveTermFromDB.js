import { connectDB } from "../db/mongo.js";
export async function getActiveTermFromDB() {
    const db = await connectDB();
    const collectionExists = await db.listCollections().toArray();
    const exist = collectionExists.length > 0;
    if (!exist) {
        return null;
    }
    const terms = await db.collection("terms");
    const currentTerm = terms.findOne({ isActive: true });
    return currentTerm;
}
