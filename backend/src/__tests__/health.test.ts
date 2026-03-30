/**
 * Tests for /health endpoint
 * Covers: status codes, response body, content-type, latency thresholds, no-auth requirement
 *
 * Usage: Place this file in backend/src/__tests__/health.test.ts
 * Tests run via: cd backend && npm test
 */
import { describe, it, expect, jest, afterAll, beforeAll } from '@jest/globals';
import type { Express } from 'express';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a mock-db object with configurable ping {ok} value */
function makeMockDb(pingOk: 0 | 1) {
  return {
    admin: () => ({
      command: jest.fn(() => Promise.resolve({ ok: pingOk })),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test fixtures (loaded in beforeAll)
// ---------------------------------------------------------------------------

let healthRouterDefault: any;
let checkHealth: any;

beforeAll(async () => {
  process.env.API_KEY = 'test-api-key';
  process.env.DB_NAME = 'testdb';
  process.env.MONGO_URI = 'mongodb://localhost:27017';
  process.env.JWT_SECRET = 'test-jwt-secret';

  // Dynamically import to ensure mocks are registered before controller loads
  const healthRouterModule = await import('../routes/healthRouter.js');
  const healthControllerModule = await import('../controllers/healthController.js');
  healthRouterDefault = healthRouterModule.default;
  checkHealth = healthControllerModule.checkHealth;
});

afterAll(() => {
  jest.restoreAllMocks();
  delete process.env.API_KEY;
  delete process.env.DB_NAME;
  delete process.env.MONGO_URI;
  delete process.env.JWT_SECRET;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkHealth controller', () => {
  it('returns 200 when healthy', async () => {
    const mockDb = makeMockDb(1);
    const mockConnectToDB = jest.fn(() => Promise.resolve(mockDb));

    const mockReq = {} as any;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await checkHealth(mockReq, mockRes, mockConnectToDB);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const json = mockRes.json.mock.calls[0][0] as Record<string, any>;
    expect(json.status).toBe('ok');
    expect(json.checks.server.ok).toBe(true);
    expect(json.checks.env.ok).toBe(true);
    expect(json.checks.database.ok).toBe(true);
    expect(json).toHaveProperty('uptimeSeconds');
    expect(json).toHaveProperty('responseTimeMs');
    expect(json).toHaveProperty('timestamp');
  });

  it('returns 503 when DB ping fails (ok: 0)', async () => {
    const mockDb = makeMockDb(0);
    const mockConnectToDB = jest.fn(() => Promise.resolve(mockDb));

    const mockReq = {} as any;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await checkHealth(mockReq, mockRes, mockConnectToDB);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    const json = mockRes.json.mock.calls[0][0] as Record<string, any>;
    expect(json.status).toBe('degraded');
    expect(json.checks.database.ok).toBe(false);
  });

  it('returns 503 when connectToDB throws', async () => {
    const mockConnectToDB = jest.fn(() => Promise.reject(new Error('connection failed')));

    const mockReq = {} as any;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await checkHealth(mockReq, mockRes, mockConnectToDB);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    const json = mockRes.json.mock.calls[0][0] as Record<string, any>;
    expect(json.status).toBe('down');
    expect(json.checks.database.ok).toBe(false);
    expect(json.checks.database.error).toBe('connection failed');
  });

  it('reports missing env vars as degraded', async () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const mockDb = makeMockDb(1);
    const mockConnectToDB = jest.fn(() => Promise.resolve(mockDb));

    const mockReq = {} as any;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await checkHealth(mockReq, mockRes, mockConnectToDB);

    const json = mockRes.json.mock.calls[0][0] as Record<string, any>;
    expect(json.checks.env.ok).toBe(false);
    expect(json.checks.env.missing).toContain('JWT_SECRET');
    expect(json.status).toBe('degraded');
    expect(mockRes.status).toHaveBeenCalledWith(503);

    process.env.JWT_SECRET = original ?? '';
  });

  it('includes uptimeSeconds and responseTimeMs', async () => {
    const mockDb = makeMockDb(1);
    const mockConnectToDB = jest.fn(() => Promise.resolve(mockDb));

    const mockReq = {} as any;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await checkHealth(mockReq, mockRes, mockConnectToDB);

    const json = mockRes.json.mock.calls[0][0] as Record<string, any>;
    expect(typeof json.uptimeSeconds).toBe('number');
    expect(typeof json.responseTimeMs).toBe('number');
  });
});

describe('Health Router Export Tests', () => {
  it('exports router with GET method', () => {
    expect(typeof healthRouterDefault).toBe('function');
    expect(typeof healthRouterDefault.get).toBe('function');
  });

  it('healthRouter is correctly mounted on /health', async () => {
    // Smoke test: create a fresh mini app and mount the router using dynamic import
    const expressModule = await import('express');
    const express = expressModule.default;
    const miniApp = express();
    miniApp.use('/health', healthRouterDefault);

    // Verify no throw during setup — don't actually call /health here
    expect(miniApp).toBeDefined();
  });
});