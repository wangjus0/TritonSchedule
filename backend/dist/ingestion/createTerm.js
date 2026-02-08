import { connectToDB } from "../services/connectToDB.js";
export async function createTerm(newTerm) {
    const db = await connectToDB();
    const terms = db.collection("terms");
    const newInsertTerm = {
        Term: newTerm,
        IsActive: true,
    };
    await terms.insertOne(newInsertTerm);
    return;
}
