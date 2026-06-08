import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";

// Rate limiter: max 1 request per 10 minutes per API key or IP
export const refreshRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.setHeader("Retry-After", "600");
    return res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded. The /refresh endpoint allows 1 request per 10 minutes.",
      retryAfter: 600,
    });
  },
  keyGenerator: (req: Request) => {
    // Use Authorization header as the key so each API key has its own limit
    const authHeader = req.headers.authorization ?? "";
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    // Fall back to IP if no auth header
    return ipKeyGenerator(req.ip ?? "unknown");
  },
});
