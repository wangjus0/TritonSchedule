export async function requireApiSecret(req: any, res: any, next: any) {
  if (req.method === "OPTIONS") {
    return next();
  }

  const publicPaths = new Set([
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/site.webmanifest",
    "/robots.txt",
  ]);
  const staticAssetPattern = /^\/(assets|static|images)\//;
  const iconPattern = /^\/(android-chrome|favicon|apple-touch-icon).*\.png$/;
  if (
    publicPaths.has(req.path) ||
    staticAssetPattern.test(req.path) ||
    iconPattern.test(req.path)
  ) {
    return next();
  }

  const expected = process.env.API_KEY;

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (expected !== token) {
    return res.status(401).send({ Message: 'Not Authorized' });
  }

  return next();

}
