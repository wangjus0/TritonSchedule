import type { NextFunction, Request, Response } from "express";
import { connectToDB } from "../services/connectToDB.js";
import { getCookie } from "../utils/getCookie.js";

type AppRole = "user" | "admin";
type UserRoleRow = { role: AppRole };

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, next, "user");
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, next, "admin");
}

async function requireAuth(req: Request, res: Response, next: NextFunction, requiredRole: AppRole) {
  const token = getCookie(req).auth;

  if (!token) {
    return res.status(401).send({ Message: "Not Authorized" });
  }

  const supabase = connectToDB();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return res.status(401).send({ Message: "Not Authorized" });
  }

  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id);

  if (roleError) {
    return res.status(500).send({ Message: "Auth check failed" });
  }

  const roles = new Set(((roleData ?? []) as UserRoleRow[]).map(({ role }) => role));
  const isAllowed = requiredRole === "admin"
    ? roles.has("admin")
    : roles.has("user") || roles.has("admin");

  if (!isAllowed) {
    return res.status(403).send({ Message: "Forbidden" });
  }

  return next();
}
