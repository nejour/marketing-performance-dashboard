// READ-ONLY GoHighLevel data pull + profiling report.
// Run from the project root:   npm run profile
//   (same as: node --use-system-ca scripts/ghl-profile.mjs
//    --use-system-ca lets Node trust the company network's certificates;
//    without it the request fails with "fetch failed")
// Needs Node 18+ (built-in fetch). Reads GHL_API_KEY and GHL_LOCATION_ID from .env.
// Only GET requests are made. Nothing in GHL is created, updated or deleted.
// The API key is never printed or written to any file.


// 1. **Pipelines:** it downloads the **list** of all 24 pipelines: their names, their stages, and how many opportunities each has. It does **not** download the opportunities inside the other pipelines. This goes to `data/raw/pipelines.json`.
// 2. **Opportunities:** it downloads **all 238 opportunities in the Sales Pipeline**, page by page, to `data/raw/opportunities.json`.
// 3. **Contacts:** it downloads the **238 contacts linked to those opportunities**, one per opportunity, to `data/raw/contacts.json`.
// Then it writes the report, `Steps/data-profile.md`, from those three files.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE = "https://services.leadconnectorhq.com";
const RAW_DIR = path.join(ROOT, "data", "raw");
const REPORT = path.join(ROOT, "Steps", "data-profile.md");
const PIPELINE_NAME = "Sales Pipeline";

// ---------- .env ----------
function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) fail("No .env file in this folder. Run the script from the project root.");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
  }
  if (!env.GHL_API_KEY) fail("GHL_API_KEY is empty in .env (line 1).");
  if (!env.GHL_LOCATION_ID) fail("GHL_LOCATION_ID is empty in .env (line 2).");
  return env;
}
function fail(msg) { console.error("\nERROR: " + msg + "\n"); process.exit(1); }
function describe(e) {
  const c = e?.cause;
  const code = c?.code || c?.errno || "";
  const detail = [e?.message, code, c?.message].filter(Boolean).join(" | ");
  let hint = "";
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/i.test(detail))
    hint = "\nHINT: your network inspects HTTPS traffic. Run again with:  node --use-system-ca scripts/ghl-profile.mjs";
  else if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ECONNRESET|UND_ERR_CONNECT_TIMEOUT/i.test(detail))
    hint = "\nHINT: Node cannot reach the internet directly. You are probably behind a company proxy (see the instructions in the chat).";
  return detail + hint;
}

const { GHL_API_KEY, GHL_LOCATION_ID } = loadEnv();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- HTTP (GET only) ----------
async function get(urlPath, params = {}, attempt = 1) {
  const url = new URL(BASE + urlPath);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${GHL_API_KEY}`, Version: "2021-07-28", Accept: "application/json" },
  });
  if (res.status === 429 && attempt <= 5) { await sleep(2000 * attempt); return get(urlPath, params, attempt + 1); }
  if (res.status >= 500 && attempt <= 3) { await sleep(1500 * attempt); return get(urlPath, params, attempt + 1); }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    const err = new Error(`GET ${url.pathname} -> HTTP ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ---------- 1. Pipelines ----------
async function fetchPipelines() {
  const data = await get("/opportunities/pipelines", { locationId: GHL_LOCATION_ID });
  return data.pipelines || [];
}

// ---------- 2. Opportunities (all pages) ----------
async function fetchOpportunities(pipelineId) {
  const all = [];
  const seen = new Set();
  let page = 1, startAfter, startAfterId, total = null;
  for (let guard = 0; guard < 500; guard++) {
    const data = await get("/opportunities/search", {
      location_id: GHL_LOCATION_ID, pipeline_id: pipelineId, limit: 100,
      ...(startAfterId ? { startAfter, startAfterId } : { page }),
    });
    const batch = data.opportunities || [];
    total = data.meta?.total ?? total;
    let added = 0;
    for (const o of batch) if (!seen.has(o.id)) { seen.add(o.id); all.push(o); added++; }
    process.stdout.write(`\r  opportunities fetched: ${all.length}${total != null ? " / " + total : ""}   `);
    if (batch.length < 100 || added === 0) break;
    if (total != null && all.length >= total) break;
    if (data.meta?.startAfterId) { startAfter = data.meta.startAfter; startAfterId = data.meta.startAfterId; }
    else page++;
    await sleep(150);
  }
  process.stdout.write("\n");
  return { opportunities: all, reportedTotal: total };
}

async function countOpportunities(pipelineId) {
  try {
    const d = await get("/opportunities/search", { location_id: GHL_LOCATION_ID, pipeline_id: pipelineId, limit: 1 });
    return d.meta?.total ?? null;
  } catch { return null; }
}

// ---------- 3. Contacts ----------
async function fetchContacts(ids) {
  const contacts = {}, missing = [];
  const list = [...ids];
  let done = 0;
  const worker = async () => {
    while (list.length) {
      const id = list.shift();
      try { const d = await get(`/contacts/${id}`); contacts[id] = d.contact || d; }
      catch (e) { missing.push({ id, status: e.status || "error" }); }
      done++;
      process.stdout.write(`\r  contacts fetched: ${done} / ${ids.size}   `);
      await sleep(120);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  process.stdout.write("\n");
  return { contacts, missing };
}

// ---------- helpers ----------
const lc = (s) => (s ?? "").toString().trim().toLowerCase();
const digits = (s) => (s ?? "").toString().replace(/\D/g, "");
const inc = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);
const sortedEntries = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
const showKey = (k) => (k === "" ? "*(empty)*" : k === null || k === undefined ? "*(missing)*" : "`" + String(k).replace(/`/g, "'") + "`");
const table = (headers, rows) =>
  [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
function stats(nums) {
  if (!nums.length) return { n: 0 };
  const s = [...nums].sort((a, b) => a - b);
  const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, min: s[0], max: s[s.length - 1], median, p90: q(0.9), p99: q(0.99), sum: s.reduce((a, b) => a + b, 0) };
}
const money = (v) => (v === undefined ? "–" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 }));
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "–");

const TEST_RE = /\b(test|testing|asdf|qwerty|demo|dummy|fake|sample|xxx|zzz|delete|ignore|do not use|lorem)\b/i;
const TEST_EMAIL_RE = /(@(example|test|mailinator|fake|demo)\.|^test|\+test)/i;
const PREFIX_RE = /^([A-Za-z]{2,4})[-_ ]/;

// ---------- main ----------
(async () => {
  console.log("READ-ONLY pull from GoHighLevel (no changes will be made).\n");
  fs.mkdirSync(RAW_DIR, { recursive: true });

  console.log("1) Pipelines");
  let pipelines;
  try { pipelines = await fetchPipelines(); }
  catch (e) {
    if (e.status === 401 || e.status === 403) fail("GHL rejected the key (HTTP " + e.status + "). Check GHL_API_KEY and GHL_LOCATION_ID in .env.");
    fail(describe(e));
  }
  fs.writeFileSync(path.join(RAW_DIR, "pipelines.json"), JSON.stringify(pipelines, null, 2));
  const pipelineCounts = {};
  for (const p of pipelines) pipelineCounts[p.id] = await countOpportunities(p.id);

  const sales =
    pipelines.find((p) => lc(p.name) === lc(PIPELINE_NAME) && (p.stages || []).length === 8) ||
    pipelines.find((p) => lc(p.name) === lc(PIPELINE_NAME)) ||
    pipelines.find((p) => (p.stages || []).length === 8);
  if (!sales) fail("Could not find the 8-stage Sales Pipeline. Pipelines found: " + pipelines.map((p) => p.name).join(", "));
  const stages = [...(sales.stages || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const stageName = Object.fromEntries(stages.map((s) => [s.id, s.name]));
  console.log(`  using pipeline: "${sales.name}" (${stages.length} stages)`);

  console.log("2) Opportunities");
  const { opportunities: opps, reportedTotal } = await fetchOpportunities(sales.id);
  fs.writeFileSync(path.join(RAW_DIR, "opportunities.json"), JSON.stringify(opps, null, 2));

  console.log("3) Contacts");
  const contactIds = new Set(opps.map((o) => o.contactId || o.contact?.id).filter(Boolean));
  const { contacts, missing } = await fetchContacts(contactIds);
  fs.writeFileSync(path.join(RAW_DIR, "contacts.json"), JSON.stringify(contacts, null, 2));
  if (missing.length) fs.writeFileSync(path.join(RAW_DIR, "contacts-missing.json"), JSON.stringify(missing, null, 2));

  console.log("4) Profiling");
  const contactOf = (o) => contacts[o.contactId || o.contact?.id] || o.contact || {};
  const L = [];
  const push = (...x) => L.push(...x);

  push(`# GHL data profile: ${sales.name}`, "",
    `Generated ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC by \`scripts/ghl-profile.mjs\` (read-only). Raw JSON is in \`data/raw/\` (git-ignored).`, "");

  // Pipelines
  push("## 1. Pipelines in this location", "",
    table(["Pipeline", "Stages", "Opportunities"], pipelines.map((p) => [p.name + (p.id === sales.id ? " ← used" : ""), (p.stages || []).length, pipelineCounts[p.id] ?? "?"])), "");
  push(`### Stages of "${sales.name}" (in order)`, "", stages.map((s, i) => `${i + 1}. ${s.name}`).join("\n"), "");

  // Totals
  const orphan = opps.filter((o) => !(o.contactId || o.contact?.id));
  push("## 2. Totals", "",
    `- Opportunities downloaded: **${opps.length}** (GHL reports ${reportedTotal ?? "?"})` + (reportedTotal != null && reportedTotal !== opps.length ? " ⚠️ mismatch, check pagination" : " ✅"),
    `- Unique contacts linked: **${contactIds.size}**`,
    `- Opportunities with no contact ID: **${orphan.length}**`,
    `- Contacts that could not be fetched (deleted / no access): **${missing.length}**`, "");

  // By stage / status
  const byStage = new Map(stages.map((s) => [s.id, 0]));
  const byStatus = new Map();
  for (const o of opps) { inc(byStage, o.pipelineStageId); inc(byStatus, o.status ?? null); }
  push("## 3. Counts by stage", "",
    table(["#", "Stage", "Count"], [...byStage.entries()].map(([id, n], i) => [stageName[id] ? i + 1 : "?", stageName[id] || `unknown stage ${id}`, n])), "");
  push("### Counts by status", "", table(["Status", "Count"], sortedEntries(byStatus).map(([k, n]) => [showKey(k), n])), "");
  const stageStatus = new Map();
  for (const o of opps) inc(stageStatus, `${stageName[o.pipelineStageId] || "?"} || ${o.status}`);
  push("### Stage × status (to spot mismatches, e.g. status won but stage not Closed)", "",
    table(["Stage", "Status", "Count"], sortedEntries(stageStatus).map(([k, n]) => { const [s, st] = k.split(" || "); return [s, st, n]; })), "");

  // Sources
  const oppSrc = new Map(), conSrc = new Map();
  for (const o of opps) { inc(oppSrc, o.source ?? null); inc(conSrc, contactOf(o).source ?? null); }
  push("## 4. Sources (exact spellings)", "", "### Opportunity `source` field", "",
    table(["Source", "Count"], sortedEntries(oppSrc).map(([k, n]) => [showKey(k), n])), "",
    "### Contact `source` field", "", table(["Source", "Count"], sortedEntries(conSrc).map(([k, n]) => [showKey(k), n])), "");

  // Tags
  const tags = new Map();
  let noTags = 0;
  for (const o of opps) { const t = contactOf(o).tags || []; if (!t.length) noTags++; for (const x of t) inc(tags, x); }
  push("## 5. Contact tags", "", `Opportunities whose contact has no tags: **${noTags}**`, "",
    tags.size ? table(["Tag", "Count"], sortedEntries(tags).map(([k, n]) => [showKey(k), n])) : "_No tags found._", "");

  // Dates
  const created = opps.map((o) => o.createdAt || o.dateAdded).filter(Boolean).map((d) => new Date(d)).sort((a, b) => a - b);
  const byMonth = new Map();
  for (const d of created) inc(byMonth, d.toISOString().slice(0, 7));
  push("## 6. Creation dates", "",
    `- Earliest: **${day(created[0])}**  ·  Latest: **${day(created[created.length - 1])}**  ·  Missing date: ${opps.length - created.length}`, "",
    table(["Month", "Opportunities"], [...byMonth.entries()].sort().map(([k, n]) => [k, n])), "");

  // Money
  const vals = opps.map((o) => o.monetaryValue);
  const numeric = vals.filter((v) => typeof v === "number");
  const won = opps.filter((o) => lc(o.status) === "won");
  const wonVals = won.map((o) => o.monetaryValue).filter((v) => typeof v === "number");
  const sAll = stats(numeric), sWon = stats(wonVals);
  const row = (label, s) => [label, s.n, money(s.min), money(s.median), money(s.p90), money(s.p99), money(s.max), money(s.sum)];
  push("## 7. Deal values (`monetaryValue`)", "",
    table(["Set", "N", "Min", "Median", "P90", "P99", "Max", "Sum"], [row("All opportunities", sAll), row("Status = won", sWon)]), "",
    `- Missing / non-numeric value: **${vals.length - numeric.length}**`,
    `- Zero: **${numeric.filter((v) => v === 0).length}** (of which won: ${wonVals.filter((v) => v === 0).length})`,
    `- Negative: **${numeric.filter((v) => v < 0).length}**`,
    `- Above 10× the won median: **${sWon.median ? numeric.filter((v) => v > 10 * sWon.median).length : "n/a"}**`, "");
  const top = [...opps].filter((o) => typeof o.monetaryValue === "number").sort((a, b) => b.monetaryValue - a.monetaryValue).slice(0, 10);
  push("### 10 largest values", "", table(["Value", "Status", "Stage", "Source", "Opportunity name"],
    top.map((o) => [money(o.monetaryValue), o.status, stageName[o.pipelineStageId] || "?", showKey(o.source), showKey(o.name)])), "");

  // Duplicates
  const byEmail = new Map(), byPhone = new Map(), byContact = new Map();
  for (const o of opps) {
    const c = contactOf(o);
    const e = lc(c.email || o.contact?.email), p = digits(c.phone || o.contact?.phone);
    if (e) inc(byEmail, e);
    if (p) inc(byPhone, p.slice(-9));
    inc(byContact, o.contactId || o.contact?.id || "none");
  }
  const dupCount = (m) => [...m.values()].filter((n) => n > 1);
  push("## 8. Duplicates", "",
    `- Emails used by more than one opportunity: **${dupCount(byEmail).length}** groups, **${dupCount(byEmail).reduce((a, b) => a + b, 0)}** opportunities`,
    `- Phones (last 9 digits) used by more than one opportunity: **${dupCount(byPhone).length}** groups, **${dupCount(byPhone).reduce((a, b) => a + b, 0)}** opportunities`,
    `- Same contact ID on more than one opportunity: **${[...byContact.entries()].filter(([k, n]) => k !== "none" && n > 1).length}** contacts`,
    `- Opportunities with no email: **${opps.filter((o) => !lc(contactOf(o).email || o.contact?.email)).length}** · no phone: **${opps.filter((o) => !digits(contactOf(o).phone || o.contact?.phone)).length}**`, "");

  // Test-looking
  const tests = opps.filter((o) => {
    const c = contactOf(o);
    const name = `${o.name || ""} ${c.firstName || ""} ${c.lastName || ""} ${c.contactName || c.name || ""}`;
    const email = c.email || o.contact?.email || "";
    const phone = digits(c.phone || o.contact?.phone);
    return TEST_RE.test(name) || TEST_EMAIL_RE.test(email) || /^(\d)\1{5,}$/.test(phone) || /^(1234567|0000000)/.test(phone.slice(-9));
  });
  push("## 9. Records that look like tests / internal", "", `**${tests.length}** opportunities matched test words, test email domains or fake phone numbers.`, "",
    tests.length ? table(["Opportunity name", "Email domain", "Stage", "Status"],
      tests.slice(0, 40).map((o) => { const c = contactOf(o); return [showKey(o.name), showKey((c.email || "").split("@")[1] || ""), stageName[o.pipelineStageId] || "?", o.status]; })) : "", "");
  const domains = new Map();
  for (const o of opps) { const d = lc((contactOf(o).email || "").split("@")[1]); if (d) inc(domains, d); }
  push("### Email domains (top 25)", "", table(["Domain", "Count"], sortedEntries(domains).slice(0, 25).map(([k, n]) => [showKey(k), n])), "");

  // Ownership signals
  const prefixes = new Map(), assigned = new Map(), company = new Map(), cfKeys = new Map();
  for (const o of opps) {
    const c = contactOf(o);
    const m = (o.name || "").match(PREFIX_RE); inc(prefixes, m ? m[1] : "(no prefix)");
    inc(assigned, o.assignedTo || "(unassigned)");
    inc(company, c.companyName || "(none)");
    for (const cf of [...(o.customFields || []), ...(c.customFields || [])]) inc(cfKeys, cf.id || cf.key || "?");
  }
  push("## 10. Fields that could separate this agency's records from other students'", "",
    "### Name prefixes (e.g. `AB-`)", "", table(["Prefix", "Count"], sortedEntries(prefixes).slice(0, 30).map(([k, n]) => [showKey(k), n])), "",
    "### Assigned user", "", table(["User ID", "Count"], sortedEntries(assigned).map(([k, n]) => [showKey(k), n])), "",
    "### Contact company name", "", table(["Company", "Count"], sortedEntries(company).slice(0, 25).map(([k, n]) => [showKey(k), n])), "",
    "### Custom fields in use", "", cfKeys.size ? table(["Field ID", "Records"], sortedEntries(cfKeys).map(([k, n]) => [showKey(k), n])) : "_None._", "");

  push("## 11. Next", "", "Turn each finding above into a decision (Step 4: which records are the agency's; Step 5: cleaning rules) and note it in the README.", "");

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, L.join("\n"));
  console.log(`\nDone. Report: Steps/data-profile.md   Raw data: data/raw/`);
})().catch((e) => fail(describe(e)));
