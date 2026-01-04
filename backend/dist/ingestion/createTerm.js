import { connectToDB } from "../db/connectToDB.js";
export async function createTerm(newTerm) {
    const db = await connectToDB();
    const terms = db.collection("terms");
    const newInsertTerm = {
        Type: "Term",
        Term: newTerm,
        IsActive: true,
    };
    await terms.insertOne(newInsertTerm);
}
