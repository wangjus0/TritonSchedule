import { connectToDB } from "../db/connectToDB.js";
import { disconnectFromDB } from "../db/disconnectFromDB.js";
export async function createTerm(newTerm) {
    const db = await connectToDB();
    const terms = db.collection("terms");
    const newInsertTerm = {
        Term: newTerm,
        IsActive: true,
    };
    await terms.insertOne(newInsertTerm);
    console.log("Term created");
    await disconnectFromDB();
    return;
}
