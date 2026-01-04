import { connectToDB } from "../db/connectToDB.js";
async function markAllTermsInactive() {
    const db = await connectToDB();
    const terms = db.collection("terms");
    const collectionExists = await db.listCollections().toArray();
    const exists = collectionExists.length > 0;
    if (!exists) {
        throw new Error("Collection does not exists");
    }
    terms.updateMany({}, { $set: { isActive: false } });
}
