import type { Response } from "express";
import type { AuthRequest } from "../middleware/verifySupabaseToken.js";

export function getProfile(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Return user info (exclude sensitive data like iat, exp if needed)
  const { sub, email, aud, exp, iat, ...rest } = req.user;

  res.json({
    userId: sub,
    email,
    aud: Array.isArray(aud) ? aud[0] : aud,
    ...rest,
  });
}
