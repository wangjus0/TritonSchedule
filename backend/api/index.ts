import app from "../src/app.js";

const allowedOrigins = [
  "https://tritonschedule.com",
  "https://triton-schedule-alpha.vercel.app",
  "http://localhost:8080",
];

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Set CORS headers
  if (isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(200).end();
  }

  // Pass to Express app
  return app(req, res);
}
