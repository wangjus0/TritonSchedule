import { connectDB } from "../db/mongo.js";
export async function createTerm(newTerm) {
    const db = await connectDB();
    const terms = db.collection("terms");
    const newInsertTerm = {
        term: newTerm,
        isActive: true,
    };
    await terms.insertOne(newInsertTerm);
}
