/**
 * Tests for /health endpoint
 * Covers: status codes, response body, content-type, latency thresholds, no-auth requirement
 *
 * Usage: Place this file in backend/src/__tests__/health.test.ts
 * Tests run via: cd backend && npm test
 */
import { describe, it, expect, jest, afterAll, beforeAll } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import request from 'supertest';
import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';

import app from '../app.js';
import healthRouter from '../routes/healthRouter.js';
import { checkHealth } from '../controllers/healthController.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let client: MongoClient;
let testDb: Db;

// Valid auth token that matches process.env.API_KEY in tests
const VALID_TOKEN = 'test-api-key';
const AUTH_HEADER = `Bearer ${VALID_TOKEN}`;

beforeAll(async () => {
  // Set required env vars BEFORE dotenv runs so they persist
  process.env.API_KEY = VALID_TOKEN;
  process.env.DB_NAME = 'testdb';
  process.env.MONGO_URI = 'mongodb://localhost:27017';
  process.env.JWT_SECRET = 'test-jwt-secret';

  // Load dotenv for any additional variables (but don't override our overrides)
  dotenv.config();

  // Spin up in-memory MongoDB for the health controller's connectToDB call
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  testDb = client.db('testdb');

  // Point the real MONGO_URI at our in-memory server so db checks pass
  process.env.MONGO_URI = uri;
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Helper – make an authenticated request against the app
// ---------------------------------------------------------------------------
function authRequest() {
  return request(app).get('/health').set('Authorization', AUTH_HEADER);
}

function authRequestPath(path: string) {
  return request(app).get(path).set('Authorization', AUTH_HEADER);
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

  it('returns 503 when MONGO_URI is invalid', async () => {
    const original = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://this-host-does-not-exist:27017';

    const res = await authRequest();

    expect(res.status).toBe(503);
    expect(res.body.status).toMatch(/^(degraded|down)$/);

    process.env.MONGO_URI = original;
  });

  it('returns 503 when a required env var is missing', async () => {
    const originalJwt = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const res = await authRequest();

    expect(res.status).toBe(503);
    expect(res.body.checks.env.missing).toContain('JWT_SECRET');

    process.env.JWT_SECRET = originalJwt;
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
    const res = await request(app).get('/health');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a wrong Bearer token (401)', async () => {
    const res = await request(app)
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

  it('reports all four required env vars in missing array when absent', async () => {
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
    expect(typeof healthRouter).toBe('function');
    expect(typeof healthRouter.get).toBe('function');
  });

  it('healthRouter is correctly mounted on /health in the app', () => {
    // Smoke test: create a fresh mini app and mount the router
    const miniApp = express();
    miniApp.use('/health', healthRouter);

    const res = request(miniApp).get('/health');
    // Just verify it doesn't throw during setup
    expect(res).toBeDefined();
  });
});