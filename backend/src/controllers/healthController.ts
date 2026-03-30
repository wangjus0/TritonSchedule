import type { Request, Response } from "express";
import { connectToDB as defaultConnectToDB } from "../services/connectToDB.js";

const REQUIRED_ENV_VARS = ["API_KEY", "DB_NAME", "MONGO_URI", "JWT_SECRET"] as const;

/**
 * Check health of the service
 * @param _req Express request (unused)
 * @param res Express response
 * @param dbFn Optional override for connectToDB (for testing only)
 */
export async function checkHealth(_req: Request, res: Response, dbFn?: () => Promise<any>) {
  const connectToDB = dbFn ?? defaultConnectToDB;
  const startedAt = Date.now();

  const envChecks = REQUIRED_ENV_VARS.map((name) => ({
    name,
    ok: Boolean(process.env[name]),
  }));

  const missingEnv = envChecks.filter((entry) => !entry.ok).map((entry) => entry.name);

  try {
    const db = await connectToDB();
    const pingResult = await db.admin().command({ ping: 1 });
    const dbOk = pingResult.ok === 1;

    const healthy = missingEnv.length === 0 && dbOk;

    return res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      checks: {
        server: { ok: true },
        env: {
          ok: missingEnv.length === 0,
          missing: missingEnv,
        },
        database: {
          ok: dbOk,
        },
      },
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return res.status(503).json({
      status: "down",
      checks: {
        server: { ok: true },
        env: {
          ok: missingEnv.length === 0,
          missing: missingEnv,
        },
        database: {
          ok: false,
          error: message,
        },
      },
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  }
}
