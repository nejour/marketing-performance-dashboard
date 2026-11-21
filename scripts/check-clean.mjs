// Runs the dashboard cleaning on the raw files saved by ghl-profile.mjs and prints the result.
// Run from the project folder:   node scripts/check-clean.mjs
// Works offline: it only reads data/raw/*.json (run ghl-profile.mjs first to refresh them).

import fs from "node:fs";
import path from "node:path";
import { buildDashboard } from "../lib/clean.mjs";

const RAW = path.join(process.cwd(), "data", "raw");
const read = (f) => JSON.parse(fs.readFileSync(path.join(RAW, f), "utf8"));

const pipelines = read("pipelines.json");
const sales = pipelines.find((p) => p.name.trim().toLowerCase() === "sales pipeline" && (p.stages || []).length === 8);
const result = buildDashboard({ stages: sales.stages, opportunities: read("opportunities.json"), contacts: read("contacts.json") });

const money = (v) => "$" + Math.round(v).toLocaleString("en-US");
const pct = (v) => (v == null ? "-" : Math.round(v * 100) + "%");
const dq = result.dataQuality;

console.log("\n=== DATA QUALITY ===");
console.log(`Started with ${dq.started} records`);
for (const [reason, n] of Object.entries(dq.removed)) console.log(`  - removed ${n}: ${reason}`);
console.log(`Kept ${dq.kept} agency leads`);
console.log(`Typical deal (median) ${money(dq.typicalDeal)} -> values above ${money(dq.suspiciousAbove)} are suspicious`);
console.log(`  - ${dq.flags.suspiciousValue} suspicious deal values (${money(dq.flags.suspiciousAmount)}) kept as leads, excluded from revenue`);
console.log(`  - ${dq.flags.zeroValueWins} won deal(s) with $0 value, counted as sales with $0 revenue`);
console.log(`  - ${dq.flags.stageStatusMismatch} record(s) where status disagrees with stage (stage used)`);

console.log("\n=== BY SOURCE (sorted by revenue) ===");
console.table(result.sources.map((s) => ({
  Source: s.source, Leads: s.leads,
  Booked: s.funnel[1], "Had call": s.funnel[2], Closed: s.funnel[3],
  "Book %": pct(s.conversion[0].rate), "Show %": pct(s.conversion[1].rate), "Close %": pct(s.conversion[2].rate),
  Revenue: money(s.revenue), "Per lead": money(s.revenuePerLead),
})));

console.log("=== PIPELINE (leads currently in each stage) ===");
console.table(Object.fromEntries(result.sources.map((s) => [s.source, s.stages])));

console.log(`TOTAL: ${result.totals.leads} leads, ${result.totals.closedDeals} closed, ${money(result.totals.revenue)} revenue`);
console.log("\n=== CHECKS ===");
for (const [k, v] of Object.entries(result.checks)) console.log(`  ${v ? "OK  " : "FAIL"} ${k}`);
console.log("\n=== RECOMMENDATION ===\n" + result.recommendation + "\n");
