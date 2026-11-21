// Local preview of the dashboard, no Vercel needed.
//
//   Live GHL data:   node --use-system-ca scripts/serve.mjs
//   Offline preview: node scripts/serve.mjs --offline      (uses data/raw/*.json)
//
// Then open http://localhost:3000 in your browser. Stop with Ctrl+C.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import handler from "../api/dashboard.mjs";
import { buildDashboard } from "../lib/clean.mjs";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 3000;
const OFFLINE = process.argv.includes("--offline");

// Load .env into process.env (values are never printed).
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
  }
}

function offlineData() {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "raw", f), "utf8"));
  const sales = read("pipelines.json").find((p) => p.name.trim().toLowerCase() === "sales pipeline" && (p.stages || []).length === 8);
  return { ok: true, offline: true, lastUpdated: fs.statSync(path.join(ROOT, "data", "raw", "opportunities.json")).mtime.toISOString(),
    cacheMinutes: 0, pipeline: sales.name, ...buildDashboard({ stages: sales.stages, opportunities: read("opportunities.json"), contacts: read("contacts.json") }) };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === "/api/dashboard") {
      if (OFFLINE) { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify(offlineData())); }
      return await handler(req, res);
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(fs.readFileSync(path.join(ROOT, "index.html")));
    }
    res.statusCode = 404; res.end("Not found");
  } catch (e) {
    console.error(e.message);
    res.statusCode = 500; res.end("Server error");
  }
}).listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}  (${OFFLINE ? "offline: data/raw files" : "live GHL data"})`);
  console.log("Press Ctrl+C to stop.");
});
