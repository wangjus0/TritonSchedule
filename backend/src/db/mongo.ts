import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
export const uri = process.env.MONGO_URI!;
