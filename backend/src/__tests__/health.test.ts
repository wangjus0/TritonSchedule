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

// Mock connectToDB at module level so database checks succeed without real MongoDB
jest.mock('../services/connectToDB.js', () => ({
  connectToDB: jest.fn(() => Promise.resolve({
    admin: () => ({ command: async () => ({ ok: 1 }) }),
  })),
}));

// Import the Express app and health router/controller
import app from '../app.js';
import healthRouter from '../routes/healthRouter.js';
import { checkHealth } from '../controllers/healthController.js';
