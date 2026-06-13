import type { Request } from "express";

export function getCookie(req: Request): Record<string, string> {
  const header = req.headers.cookie;

  if (!header) {
    return {};
  }

  return header.split(";").reduce<Record<string, string>>((cookies, pair) => {
    const [rawName, ...rawValue] = pair.trim().split("=");

    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}
