import { client } from "../services/connectToDB.js";
export async function disconnectFromDB() {
    await client.close();
}
