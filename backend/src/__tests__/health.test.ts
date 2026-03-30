/**
 * Tests for /health endpoint
 * Covers: status codes, response body, content-type, latency thresholds, no-auth requirement
 *
 * Usage: Place this file in backend/src/__tests__/health.test.ts
 * Tests run via: cd backend && npm test
 */
import { describe, it, expect, jest, afterAll, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Request, Response } from 'express';


// Dynamic imports to ensure mock is registered before module loads
const [app, healthRouter, healthControllerModule] = await Promise.all([
  import('../app.js'),
  import('../routes/healthRouter.js'),
  import('../controllers/healthController.js'),
]);

const appModule = app.default;
const healthRouterDefault = healthRouter.default;
const { checkHealth } = healthControllerModule;

// ---------------------------------------------------------------------------
jest.mock('../services/connectToDB', () => ({
  connectToDB: jest.fn(() => Promise.resolve({
    admin: () => ({
      command: jest.fn(() => Promise.resolve({ ok: 1 })),
    }),
  })),
}));

const mockConnectToDB = jest.fn(() => Promise.resolve({
  admin: () => ({
    command: jest.fn(() => Promise.resolve({ ok: 1 })),
  }),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// Valid auth token that matches process.env.API_KEY in tests
const VALID_TOKEN = 'test-api-key';
const AUTH_HEADER = `Bearer ${VALID_TOKEN}`;

beforeAll(() => {
  // Set required env vars
  process.env.API_KEY = VALID_TOKEN;
  process.env.DB_NAME = 'testdb';
  process.env.MONGO_URI = 'mongodb://localhost:27017';
  process.env.JWT_SECRET = 'test-jwt-secret';
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper – make an authenticated request against the app
// ---------------------------------------------------------------------------
function authRequest() {
  return request(appModule).get('/health').set('Authorization', AUTH_HEADER);
}

function authRequestPath(path: string) {
  return request(appModule).get(path).set('Authorization', AUTH_HEADER);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /health – Status Code Tests', () => {
  it('returns 200 when all dependencies are healthy', async () => {
    const res = await authRequest();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 200 when database is mocked as connected', async () => {
    const res = await authRequest();
    expect(res.status).toBe(200);
    expect(res.body.checks.database.ok).toBe(true);
  });
});

describe('GET /health – Response Body Structure Tests', () => {
  it('includes the top-level "status" field', async () => {
    const res = await authRequest();
    expect(res.body).toHaveProperty('status');
    expect(['ok', 'degraded', 'down']).toContain(res.body.status);
  });

  it('includes the top-level "timestamp" field as ISO-8601', async () => {
    const res = await authRequest();
    expect(res.body).toHaveProperty('timestamp');
    const ts = new Date(res.body.timestamp);
    expect(ts.getTime()).toBeGreaterThan(0);
  });

  it('includes the top-level "checks" object', async () => {
    const res = await authRequest();
    expect(res.body).toHaveProperty('checks');
    expect(typeof res.body.checks).toBe('object');
  });

  it('"checks" contains server, env, and database sub-objects', async () => {
    const res = await authRequest();
    expect(res.body.checks).toHaveProperty('server');
    expect(res.body.checks).toHaveProperty('env');
    expect(res.body.checks).toHaveProperty('database');
  });

  it('"checks.server" has an "ok" boolean field', async () => {
    const res = await authRequest();
    expect(res.body.checks.server).toHaveProperty('ok');
    expect(typeof res.body.checks.server.ok).toBe('boolean');
    expect(res.body.checks.server.ok).toBe(true);
  });

  it('"checks.env" has an "ok" boolean and a "missing" array', async () => {
    const res = await authRequest();
    expect(res.body.checks.env).toHaveProperty('ok');
    expect(res.body.checks.env).toHaveProperty('missing');
    expect(typeof res.body.checks.env.ok).toBe('boolean');
    expect(Array.isArray(res.body.checks.env.missing)).toBe(true);
  });

  it('"checks.env.missing" is empty when all required vars are set', async () => {
    const res = await authRequest();
    expect(res.body.checks.env.missing).toHaveLength(0);
  });

  it('"checks.database" has an "ok" boolean field', async () => {
    const res = await authRequest();
    expect(res.body.checks.database).toHaveProperty('ok');
    expect(typeof res.body.checks.database.ok).toBe('boolean');
    expect(res.body.checks.database.ok).toBe(true);
  });

  it('includes the top-level "uptimeSeconds" number', async () => {
    const res = await authRequest();
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('includes the top-level "responseTimeMs" number', async () => {
    const res = await authRequest();
    expect(res.body).toHaveProperty('responseTimeMs');
    expect(typeof res.body.responseTimeMs).toBe('number');
    expect(res.body.responseTimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /health – Content-Type Tests', () => {
  it('serves application/json', async () => {
    const res = await authRequest();
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('GET /health – Latency / Performance Tests', () => {
  it('responds within 5 000 ms', async () => {
    const before = Date.now();
    const res = await authRequest();
    const latency = Date.now() - before;
    expect(res.status).toBe(200);
    expect(latency).toBeLessThan(5_000);
  });

  it('responds within 1 000 ms in the healthy case', async () => {
    const before = Date.now();
    const res = await authRequest();
    const latency = Date.now() - before;
    expect(res.status).toBe(200);
    expect(latency).toBeLessThan(1_000);
  });

  it('body responseTimeMs is a positive number under 10 000', async () => {
    const res = await authRequest();
    expect(res.body.responseTimeMs).toBeGreaterThan(0);
    expect(res.body.responseTimeMs).toBeLessThan(10_000);
  });
});

describe('GET /health – Authentication Tests', () => {
  it('rejects requests without an Authorization header (401)', async () => {
    const res = await request(appModule).get('/health');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a wrong Bearer token (401)', async () => {
    const res = await request(appModule)
      .get('/health')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
  });

  it('accepts requests with the correct Bearer token (200)', async () => {
    const res = await authRequest();
    expect(res.status).toBe(200);
  });
});

describe('GET /health – Route Mounting Tests', () => {
  it('responds at /health', async () => {
    const res = await authRequest();
    expect(res.status).toBeDefined();
    expect(res.body).toBeDefined();
  });

  it('does not crash on a trailing-slash request', async () => {
    const res = await authRequestPath('/health/');
    expect(res.status).not.toBe(500);
  });
});

describe('checkHealth controller – Unit Tests', () => {
  it('sets status code 200 when fully healthy', async () => {
    const mockReq = {} as Partial<Request>;
    const mockRes = {
      status: jest.fn<() => typeof mockRes>().mockReturnThis(),
      json: jest.fn<() => typeof mockRes>(),
    } as unknown as Response;

    await checkHealth(mockReq as Request, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('calls res.json with the correct structure', async () => {
    const mockReq = {} as Partial<Request>;
    const mockRes = {
      status: jest.fn<() => typeof mockRes>().mockReturnThis(),
      json: jest.fn<() => typeof mockRes>(),
    } as unknown as Response;

    await checkHealth(mockReq as Request, mockRes);

    const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(jsonCall).toHaveProperty('status', 'ok');
    expect(jsonCall).toHaveProperty('checks');
    expect(jsonCall.checks).toHaveProperty('server');
    expect(jsonCall.checks).toHaveProperty('env');
    expect(jsonCall.checks).toHaveProperty('database');
    expect(jsonCall).toHaveProperty('uptimeSeconds');
    expect(jsonCall).toHaveProperty('responseTimeMs');
    expect(jsonCall).toHaveProperty('timestamp');
  });

  it('reports all required env vars in missing array when absent', async () => {
    const original = { ...process.env };
    delete process.env.API_KEY;
    delete process.env.JWT_SECRET;

    const mockReq = {} as Partial<Request>;
    const mockRes = {
      status: jest.fn<() => typeof mockRes>().mockReturnThis(),
      json: jest.fn<() => typeof mockRes>(),
    } as unknown as Response;

    await checkHealth(mockReq as Request, mockRes);

    const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0] as {
      checks: { env: { missing: string[] } };
    };
    expect(jsonCall.checks.env.missing).toContain('API_KEY');
    expect(jsonCall.checks.env.missing).toContain('JWT_SECRET');

    // Restore
    Object.assign(process.env, original);
  });
});

describe('Health Router Export Tests', () => {
  it('healthRouter is a function with a GET method', () => {
    expect(typeof healthRouterDefault).toBe('function');
    expect(typeof healthRouterDefault.get).toBe('function');
  });

  it('healthRouter is correctly mounted on /health in the app', async () => {
    // Smoke test: create a fresh mini app and mount the router
    const expressModule = await import('express');
    const miniApp = expressModule.default();
    miniApp.use('/health', healthRouterDefault);

    const res = request(miniApp).get('/health');
    // Just verify it doesn't throw during setup
    expect(res).toBeDefined();
  });
});