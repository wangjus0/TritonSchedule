import type { Request, Response } from "express";
import { connectToSupabase } from "../services/supabase.js";

const REQUIRED_ENV_VARS = ["API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"] as const;

/**
 * Check health of the service
 * @param _req Express request (unused)
 * @param res Express response
 */
export async function checkHealth(_req: Request, res: Response) {
  const startedAt = Date.now();

  const envChecks = REQUIRED_ENV_VARS.map((name) => ({
    name,
    ok: Boolean(process.env[name]),
  }));

  const missingEnv = envChecks.filter((entry) => !entry.ok).map((entry) => entry.name);

  let dbOk = false;
  let dbError: string | null = null;

  try {
    const supabase = await connectToSupabase();
    // Simple query to check connectivity
    const { error } = await supabase.from('terms').select('id').limit(1);
    dbOk = !error;
    if (error) {
      dbError = error.message;
    }
  } catch (err) {
    dbOk = false;
    dbError = err instanceof Error ? err.message : "Unknown database error";
  }

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
        error: dbError,
      },
    },
    uptimeSeconds: Math.floor(process.uptime()),
    responseTimeMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
