import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
let client: MongoClient;
let db: Db;

const uri = process.env.MONGO_URI;
const dbName = process.env.CLUSTER_ONE_NAME!;

export async function connectToDB() {
  if (db) return db;

  client = new MongoClient(uri + dbName);

  await client.connect();

  db = client.db(dbName);

  console.log("MongoDB connected");

  return db;
}
