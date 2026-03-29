import { describe, it, expect } from '@jest/globals';
import { disconnectFromDB } from "../services/disconnectFromDB.js";

describe("disconnectFromDB", () => {
  it("should not throw when client is null", async () => {
    // The module initializes with null client
    await expect(disconnectFromDB()).resolves.toBeUndefined();
  });
});