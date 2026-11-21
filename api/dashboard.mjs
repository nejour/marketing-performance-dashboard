// Vercel serverless function: GET /api/dashboard
// Holds the GHL key (from environment variables), pulls the Sales Pipeline,
// runs the cleaning rules and returns ONLY aggregated numbers to the browser.

import { fetchSalesPipeline } from "../lib/ghl.mjs";
import { buildDashboard } from "../lib/clean.mjs";

// How long the numbers are reused before GoHighLevel is asked again.
// Set CACHE_MINUTES in .env / Vercel to change it (1 to 1440). Default: 15.
function cacheMinutes() {
  const n = Number(process.env.CACHE_MINUTES);
  return Number.isInteger(n) && n >= 1 && n <= 1440 ? n : 15;
}
let cache = null; // { body, at } kept while the function instance is warm

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method && req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, message: "Only GET is allowed." }));
  }

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, message: "The dashboard is not set up yet: the GoHighLevel connection details are missing." }));
  }

  const CACHE_MINUTES = cacheMinutes();
  const fresh = cache && Date.now() - cache.at < CACHE_MINUTES * 60 * 1000;
  if (!fresh) {
    try {
      const raw = await fetchSalesPipeline({ apiKey, locationId });
      const result = buildDashboard(raw);
      cache = {
        at: Date.now(),
        body: { ok: true, lastUpdated: new Date().toISOString(), cacheMinutes: CACHE_MINUTES, pipeline: raw.pipeline.name, ...result },
      };
    } catch (err) {
      // Log the reason on the server only (never the key), show a friendly message.
      console.error("dashboard: GHL fetch failed:", err.status || "", err.message);
      if (cache) {
        // Serve the last good numbers rather than nothing.
        res.statusCode = 200;
        return res.end(JSON.stringify({ ...cache.body, stale: true }));
      }
      res.statusCode = 502;
      const message = err.status === 401 || err.status === 403
        ? "GoHighLevel refused the connection (the access key may have changed). The numbers will be back once it is fixed."
        : "We couldn't reach GoHighLevel right now. Please try again in a few minutes.";
      return res.end(JSON.stringify({ ok: false, message }));
    }
  }

  res.setHeader("Cache-Control", `public, s-maxage=${CACHE_MINUTES * 60}, stale-while-revalidate=300`);
  res.statusCode = 200;
  res.end(JSON.stringify(cache.body));
}
