import type { Request, Response } from "express";
import { pingDatabase as defaultPingDatabase } from "../services/connectToDB.js";

const REQUIRED_ENV_VARS = ["CRON_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/**
 * Check health of the service
 * @param _req Express request (unused)
 * @param res Express response
 * @param dbFn Optional override for database ping (for testing only)
 */
export async function checkHealth(_req: Request, res: Response, dbFn?: () => Promise<any>) {
  const pingDatabase = dbFn ?? defaultPingDatabase;
  const startedAt = Date.now();

  const envChecks = REQUIRED_ENV_VARS.map((name) => ({
    name,
    ok: Boolean(process.env[name]),
  }));

  const missingEnv = envChecks.filter((entry) => !entry.ok).map((entry) => entry.name);

  try {
    const pingResult = await pingDatabase();
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
