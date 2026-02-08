import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
export let client: MongoClient;
let db: Db;

const uri = process.env.MONGO_URI || "";
const dbName = process.env.DB_NAME!;

export async function connectToDB() {
  if (db) return db;

  client = new MongoClient(uri);

  await client.connect();

  db = client.db(dbName);

  return db;
}
