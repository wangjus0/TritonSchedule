// Setup file for tests - sets required env vars
process.env.DB_NAME = "testdb";
process.env.MONGO_URI = "mongodb://localhost:27017";
process.env.API_SECRET = "test-secret";

// Clear any cached MongoDB connections before tests
if (global.__mongoCache) {
  global.__mongoCache = {
    client: null,
    clientPromise: null,
    db: null,
  };
}
