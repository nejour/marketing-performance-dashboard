// Read-only GoHighLevel client used by the dashboard.
// Only GET requests. The API key is passed in by the caller and never logged or returned.

const BASE = "https://services.leadconnectorhq.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(apiKey, urlPath, params = {}, attempt = 1) {
  const url = new URL(BASE + urlPath);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28", Accept: "application/json" },
  });
  if ((res.status === 429 || res.status >= 500) && attempt <= 3) { await sleep(1000 * attempt); return get(apiKey, urlPath, params, attempt + 1); }
  if (!res.ok) {
    const err = new Error(`GHL ${url.pathname} answered HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Returns { pipeline, stages, opportunities, contacts } for the 8-stage Sales Pipeline.
// Contacts come from the copy GHL embeds in each opportunity (tags, email, phone),
// so no extra request per contact is needed.
export async function fetchSalesPipeline({ apiKey, locationId, pipelineName = "Sales Pipeline" }) {
  const { pipelines = [] } = await get(apiKey, "/opportunities/pipelines", { locationId });
  const norm = (s) => (s || "").trim().toLowerCase();
  const pipeline =
    pipelines.find((p) => norm(p.name) === norm(pipelineName) && (p.stages || []).length === 8) ||
    pipelines.find((p) => norm(p.name) === norm(pipelineName));
  if (!pipeline) throw Object.assign(new Error(`Pipeline "${pipelineName}" not found`), { status: 404 });

  const opportunities = [];
  const seen = new Set();
  let page = 1, startAfter, startAfterId, total = null;
  for (let guard = 0; guard < 200; guard++) {
    const data = await get(apiKey, "/opportunities/search", {
      location_id: locationId, pipeline_id: pipeline.id, limit: 100,
      ...(startAfterId ? { startAfter, startAfterId } : { page }),
    });
    const batch = data.opportunities || [];
    total = data.meta?.total ?? total;
    let added = 0;
    for (const o of batch) if (!seen.has(o.id)) { seen.add(o.id); opportunities.push(o); added++; }
    if (batch.length < 100 || added === 0 || (total != null && opportunities.length >= total)) break;
    if (data.meta?.startAfterId) { startAfter = data.meta.startAfter; startAfterId = data.meta.startAfterId; }
    else page++;
  }

  const contacts = {};
  for (const o of opportunities) {
    const id = o.contactId || o.contact?.id;
    if (id && o.contact) contacts[id] = o.contact;
  }
  return { pipeline: { id: pipeline.id, name: pipeline.name }, stages: pipeline.stages || [], opportunities, contacts, reportedTotal: total };
}
