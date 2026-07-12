import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { requireAdmin } from "../middleware/requireAdmin.js";

const originalApiKey = process.env.API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.API_KEY;
  else process.env.API_KEY = originalApiKey;
});

function runMiddleware(apiKey?: string) {
  const req = {
    get: jest.fn((name: string) => (name === "x-api-key" ? apiKey : undefined)),
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  requireAdmin(req as any, res as any, next);

  return { next, res };
}

describe("requireAdmin", () => {
  it("requires the x-api-key header to match API_KEY", () => {
    process.env.API_KEY = "secret";

    expect(runMiddleware().res.status).toHaveBeenCalledWith(401);
    expect(runMiddleware("wrong").res.status).toHaveBeenCalledWith(401);
    expect(runMiddleware("secret").next).toHaveBeenCalledTimes(1);
  });
});
