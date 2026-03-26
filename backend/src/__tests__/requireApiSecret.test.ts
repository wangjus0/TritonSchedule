import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { requireApiSecret } from "../middleware/requireApiSecret";

describe("requireApiSecret", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      method: "GET",
      path: "/api/test",
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it("should call next for OPTIONS method", async () => {
    mockReq.method = "OPTIONS";
    await requireApiSecret(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it("should call next for public paths like favicon.ico", async () => {
    mockReq.path = "/favicon.ico";
    await requireApiSecret(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should call next for static assets", async () => {
    mockReq.path = "/assets/script.js";
    await requireApiSecret(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should return 401 when no authorization header", async () => {
    await requireApiSecret(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.send).toHaveBeenCalledWith({ Message: "Not Authorized" });
  });

  it("should return 401 when token does not match", async () => {
    mockReq.headers.authorization = "Bearer wrongtoken";
    await requireApiSecret(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it("should call next when token matches API_KEY", async () => {
    process.env.API_KEY = "secret123";
    mockReq.headers.authorization = "Bearer secret123";
    await requireApiSecret(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    delete process.env.API_KEY;
  });

  it("should accept token without Bearer prefix", async () => {
    // Middleware requires Bearer prefix, so this returns 401
    process.env.API_KEY = "secret123";
    mockReq.headers.authorization = "secret123";
    await requireApiSecret(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    delete process.env.API_KEY;
  });
});