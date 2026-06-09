import { describe, it, expect } from '@jest/globals';
import courseRouter from '../routes/courseRouter.js';
import refreshRouter from '../routes/refreshRouter.js';
import rmpRouter from '../routes/rmpRouter.js';
import termRouter from '../routes/termRouter.js';

describe("route exports", () => {
  it("should export the course router", () => {
    expect(typeof courseRouter).toBe("function");
    expect(typeof courseRouter.get).toBe("function");
  });

  it("should export the rmp router", () => {
    expect(typeof rmpRouter).toBe("function");
    expect(typeof rmpRouter.get).toBe("function");
  });

  it("should export the term router", () => {
    expect(typeof termRouter).toBe("function");
    expect(typeof termRouter.get).toBe("function");
  });

  it("should export the refresh router", () => {
    expect(typeof refreshRouter).toBe("function");
    expect(typeof refreshRouter.post).toBe("function");
  });
});
