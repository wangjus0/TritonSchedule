import { MongoClient, Db, MongoNetworkError } from "mongodb";

type MongoCache = {
  client: MongoClient | null;
  clientPromise: Promise<MongoClient> | null;
  db: Db | null;
};

const globalForMongo = globalThis as typeof globalThis & {
  __mongoCache?: MongoCache;
};

const mongoCache: MongoCache = globalForMongo.__mongoCache ?? {
  client: null,
  clientPromise: null,
  db: null,
};

globalForMongo.__mongoCache = mongoCache;

export let client: MongoClient | null = mongoCache.client;
let connecting: Promise<Db> | null = null;

const MAX_CONNECTION_ATTEMPTS = 2;

export function getMongoConfig() {
  const dbName = process.env.DB_NAME;
  const uri = process.env.MONGO_URI;

  if (!dbName) throw new Error("Missing DB_NAME environment variable");
  if (!uri) throw new Error("Missing MONGO_URI environment variable");

  return { dbName, uri };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldRetry(error: unknown) {
  if (!(error instanceof MongoNetworkError)) return false;

  const message = error.message.toLowerCase();
  return message.includes("tlsv1 alert internal error") || message.includes("socket") || message.includes("timed out");
}

async function clearBrokenClient() {
  if (mongoCache.client) {
    await mongoCache.client.close().catch(() => undefined);
  }

  mongoCache.client = null;
  mongoCache.clientPromise = null;
  mongoCache.db = null;
  client = null;
}

async function getConnectedDb() {
  if (mongoCache.db) return mongoCache.db;

  const { dbName, uri } = getMongoConfig();

  if (!mongoCache.clientPromise) {
    mongoCache.client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryReads: true,
      retryWrites: true,
      tls: true,
    });

    mongoCache.clientPromise = mongoCache.client.connect();
  }

  const connectedClient = await mongoCache.clientPromise;
  const connectedDb = connectedClient.db(dbName);

  mongoCache.client = connectedClient;
  mongoCache.db = connectedDb;
  client = connectedClient;

  return connectedDb;
}

export async function connectToDB() {
  if (mongoCache.db) return mongoCache.db;
  if (connecting) return connecting;

  connecting = (async () => {
    let attempt = 0;

    while (attempt < MAX_CONNECTION_ATTEMPTS) {
      try {
        return await getConnectedDb();
      } catch (error) {
        attempt += 1;
        await clearBrokenClient();

        if (!shouldRetry(error) || attempt >= MAX_CONNECTION_ATTEMPTS) {
          throw error;
        }

        await sleep(150 * attempt);
      }
    }

    throw new Error("Unable to connect to MongoDB");
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}
