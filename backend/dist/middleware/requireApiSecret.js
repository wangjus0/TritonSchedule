export async function requireApiSecret(req, res, next) {
    const expected = process.env.API_KEY;
    const isCronRequest = req.headers["x-vercel-cron"] === "1";
    const isRefreshEndpoint = String(req.path).startsWith("/api/refresh");
    if (isCronRequest && isRefreshEndpoint) {
        return next();
    }
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (expected !== token) {
        return res.status(401).send({ Message: 'Not Authorized' });
    }
    return next();
}
