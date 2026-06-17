import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type AppRole = "user" | "admin";
type AuthState = {
  authError: Error | null;
  roleError: Error | null;
  roles: Array<{ role: AppRole }>;
  user: { id: string } | null;
};

const authState: AuthState = {
  authError: null,
  roleError: null,
  roles: [{ role: "user" }],
  user: { id: "user-id" },
};

jest.unstable_mockModule("../../src/services/connectToDB.js", () => ({
  connectToDB: () => ({
    auth: {
      getUser: async () => ({
        data: { user: authState.user },
        error: authState.authError,
      }),
    },
    from: () => {
      const query: any = {
        eq: async () => ({ data: authState.roles, error: authState.roleError }),
        select: () => query,
      };

      return query;
    },
  }),
}));

const { requireAdmin, requireApiBearer, requireUser } = await import("../../src/middleware/auth.js");

const authCookie = "auth=validtoken";

function resetAuthState(overrides: Partial<AuthState> = {}) {
  authState.authError = null;
  authState.roleError = null;
  authState.roles = [{ role: "user" }];
  authState.user = { id: "user-id" };

  Object.assign(authState, overrides);
}

function appWith(middleware: RequestHandler) {
  const app = express();
  app.get("/protected", middleware, (_req, res) => res.status(200).send({ ok: true }));
  return app;
}

describe("auth middleware", () => {
  beforeEach(() => {
    resetAuthState();
    process.env.CRON_SECRET = "secret123";
  });

  it("When bearer token matches then machine middleware succeeds", async () => {
    await request(appWith(requireApiBearer))
      .get("/protected")
      .set("Authorization", "Bearer secret123")
      .expect(200, { ok: true });
  });

  it("When bearer token is missing then machine middleware returns 401", async () => {
    await request(appWith(requireApiBearer))
      .get("/protected")
      .expect(401, { Message: "Not Authorized" });
  });

  it("When auth cookie is missing then user middleware returns 401", async () => {
    await request(appWith(requireUser))
      .get("/protected")
      .expect(401, { Message: "Not Authorized" });
  });

  it("When token is invalid then user middleware returns 401", async () => {
    resetAuthState({
      authError: new Error("invalid token"),
      user: null,
    });

    await request(appWith(requireUser))
      .get("/protected")
      .set("Cookie", "auth=badtoken")
      .expect(401, { Message: "Not Authorized" });
  });

  it("When user accesses user route then request succeeds", async () => {
    await request(appWith(requireUser))
      .get("/protected")
      .set("Cookie", authCookie)
      .expect(200, { ok: true });
  });

  it("When admin accesses user route then request succeeds", async () => {
    resetAuthState({ roles: [{ role: "admin" }] });

    await request(appWith(requireUser))
      .get("/protected")
      .set("Cookie", "theme=dark; auth=validtoken; sidebar=false")
      .expect(200, { ok: true });
  });

  it("When user accesses admin route then middleware returns 403", async () => {
    await request(appWith(requireAdmin))
      .get("/protected")
      .set("Cookie", authCookie)
      .expect(403, { Message: "Forbidden" });
  });

  it("When admin accesses admin route then request succeeds", async () => {
    resetAuthState({ roles: [{ role: "admin" }] });

    await request(appWith(requireAdmin))
      .get("/protected")
      .set("Cookie", authCookie)
      .expect(200, { ok: true });
  });

  it("When role check fails then middleware returns 500", async () => {
    resetAuthState({ roleError: new Error("database error") });

    await request(appWith(requireUser))
      .get("/protected")
      .set("Cookie", authCookie)
      .expect(500, { Message: "Auth check failed" });
  });

  it("When auth cookie is malformed then middleware returns 401", async () => {
    await request(appWith(requireAdmin))
      .get("/protected")
      .set("Cookie", "auth=%E0%A4%A")
      .expect(401, { Message: "Not Authorized" });
  });

  it("When unrelated cookie is malformed then valid auth still succeeds", async () => {
    resetAuthState({ roles: [{ role: "admin" }] });

    await request(appWith(requireAdmin))
      .get("/protected")
      .set("Cookie", "bad=%E0%A4%A; auth=validtoken")
      .expect(200, { ok: true });
  });
});
