import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { shouldRetry, getMongoConfig } from "../services/connectToDB.js";
import { MongoNetworkError } from "mongodb";

describe("connectToDB helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("shouldRetry", () => {
    it("should return false for non-MongoNetworkError", () => {
      const error = new Error("some error");
      expect(shouldRetry(error)).toBe(false);
    });

    it("should return true for TLS alert internal error", () => {
      const error = new MongoNetworkError("tlsv1 alert internal error");
      expect(shouldRetry(error)).toBe(true);
    });

    it("should return true for socket errors", () => {
      const error = new MongoNetworkError("socket closed unexpectedly");
      expect(shouldRetry(error)).toBe(true);
    });

    it("should return true for timeout errors", () => {
      const error = new MongoNetworkError("connection timed out");
      expect(shouldRetry(error)).toBe(true);
    });

    it("should return false for other MongoNetworkError", () => {
      const error = new MongoNetworkError("not a retryable error");
      expect(shouldRetry(error)).toBe(false);
    });
  });

  describe("getMongoConfig", () => {
    it("should throw when DB_NAME is missing", () => {
      const envWithoutDB = { ...process.env };
      delete envWithoutDB.DB_NAME;
      delete envWithoutDB.MONGO_URI;
      const original = process.env;
      process.env = envWithoutDB;
      try {
        expect(() => getMongoConfig()).toThrow("Missing DB_NAME");
      } finally {
        process.env = original;
      }
    });

    it("should throw when MONGO_URI is missing", () => {
      const envWithoutURI = { ...process.env, DB_NAME: "testdb", MONGO_URI: undefined } as typeof process.env;
      const original = process.env;
      process.env = envWithoutURI;
      try {
        expect(() => getMongoConfig()).toThrow("Missing MONGO_URI");
      } finally {
        process.env = original;
      }
    });

    it("should return config when both vars present", () => {
      const original = process.env;
      process.env = { ...original, DB_NAME: "testdb", MONGO_URI: "mongodb://localhost:27017" };
      try {
        expect(getMongoConfig()).toEqual({
          dbName: "testdb",
          uri: "mongodb://localhost:27017",
        });
      } finally {
        process.env = original;
      }
    });
  });
});