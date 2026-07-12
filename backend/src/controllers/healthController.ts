import type { Request, Response } from "express";
import { pingSupabase } from "../services/supabaseStore.js";

const REQUIRED_ENV_VARS = ["API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"] as const;

/**
 * Check health of the service
 * @param _req Express request (unused)
 * @param res Express response
 * @param pingFn Optional override for testing only
 */
export async function checkHealth(_req: Request, res: Response, pingFn: () => Promise<unknown> = pingSupabase) {
  const startedAt = Date.now();

  const envChecks = REQUIRED_ENV_VARS.map((name) => ({
    name,
    ok: Boolean(process.env[name]),
  }));

  const missingEnv = envChecks.filter((entry) => !entry.ok).map((entry) => entry.name);

  try {
    await pingFn();

    const healthy = missingEnv.length === 0;

    return res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      checks: {
        server: { ok: true },
        env: {
          ok: missingEnv.length === 0,
          missing: missingEnv,
        },
        database: {
          ok: true,
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
