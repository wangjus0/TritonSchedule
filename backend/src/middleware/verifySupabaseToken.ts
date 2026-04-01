import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    aud: string;
    exp: number;
    iat: number;
    [key: string]: any;
  };
}

export function verifySupabaseToken(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS") {
    return next();
  }

  // Skip auth for public routes (like health check)
  const publicPaths = new Set([
    "/health",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/site.webmanifest",
    "/robots.txt",
  ]);
  const staticAssetPattern = /^\/(assets|static|images)\//;
  const iconPattern = /^\/(android-chrome|favicon|apple-touch-icon).*\.png$/;

  if (
    publicPaths.has(req.path) ||
    staticAssetPattern.test(req.path) ||
    iconPattern.test(req.path)
  ) {
    return next();
  }

  const authHeader = req.headers.authorization ?? "";
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ error: "No authorization token provided" });
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    console.error("SUPABASE_JWT_SECRET is not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256", "HS384", "HS512"],
    }) as jwt.JwtPayload;

    // Handle aud which can be string or string[]
    const aud = Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud;

    // Attach user info to request object
    req.user = {
      sub: decoded.sub || "",
      email: decoded.email,
      aud: aud || "",
      exp: decoded.exp || 0,
      iat: decoded.iat || 0,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }

    console.error("JWT verification error:", error);
    return res.status(500).json({ error: "Token verification failed" });
  }
}
