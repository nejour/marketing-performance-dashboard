// Tests for the cleaning rules in lib/clean.mjs.
// Run from the project folder:   node --test tests/
// The small examples below are made up; the last test uses data/raw/ when it exists.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDashboard, cleanSource, UNKNOWN_SOURCE } from "../lib/clean.mjs";

// The 8 stages of the Sales Pipeline, in GoHighLevel's order.
const STAGE_NAMES = ["Qualified Opt In", "Disqualified", "Booked call", "Closed", "Cancelled", "No Show", "Follow Up", "Lost"];
const stages = STAGE_NAMES.map((name, i) => ({ id: "st" + i, name, position: i }));
const stageId = (name) => "st" + STAGE_NAMES.indexOf(name);
const STATUS = { "Closed": "won", "Lost": "lost", "Disqualified": "lost", "Cancelled": "abandoned", "No Show": "abandoned" };

let n = 0;
// Builds one opportunity + its contact. Defaults to a clean agency lead.
function lead({ stage = "Qualified Opt In", status, value = 5000, source = "Referral", tags = ["dash-project"], email, phone = null, name, createdAt = "2026-09-04T10:00:00Z" } = {}) {
  n++;
  const contactId = "c" + n;
  return {
    opp: { id: "o" + n, name: name || `Company - Person ${n}`, monetaryValue: value, pipelineStageId: stageId(stage),
      status: status || STATUS[stage] || "open", source, contactId, createdAt },
    contact: { id: contactId, email: email || `person${n}@example.com`, phone, tags },
  };
}
function run(leads) {
  return buildDashboard({
    stages,
    opportunities: leads.map((l) => l.opp),
    contacts: Object.fromEntries(leads.map((l) => [l.contact.id, l.contact])),
  });
}
const src = (d, name) => d.sources.find((s) => s.source === name);

test("keeps only agency leads and counts every removal by reason", () => {
  const d = run([
    lead(), lead(),
    lead({ tags: ["demo-data", "sandbox"] }),
    lead({ tags: ["leadpulse-test"], name: "TEST - LeadPulse Website Inquiry", email: "demo@example.com" }),
    lead({ tags: [] }),
  ]);
  assert.equal(d.dataQuality.started, 5);
  assert.equal(d.dataQuality.kept, 2);
  assert.deepEqual(d.dataQuality.removed, {
    "Demo / sandbox data": 1,
    "Test lead": 1,
    "Not this agency's data (added by another user)": 1,
  });
  assert.equal(d.checks.keptPlusRemovedIsRaw, true);
});

test("a name starting with TEST is a test lead even without the test tag", () => {
  const d = run([lead(), lead({ name: "Test lead please ignore" })]);
  assert.equal(d.dataQuality.removed["Test lead"], 1);
});

test("a suspicious deal value keeps the lead but stays out of revenue and stage values", () => {
  const leads = [];
  for (let i = 0; i < 9; i++) leads.push(lead({ stage: "Closed", value: 5000, source: "Billboard" }));
  leads.push(lead({ stage: "Closed", value: 145000, source: "Billboard" }));
  leads.push(lead({ stage: "Follow Up", value: 145000, source: "Billboard" }));
  const d = run(leads);
  const b = src(d, "Billboard");
  assert.equal(b.leads, 11);                         // both suspicious leads still counted
  assert.equal(b.closedDeals, 10);                   // the suspicious win still counts as a sale
  assert.equal(b.revenue, 9 * 5000);                 // but its $145,000 is not revenue
  assert.equal(b.stageValues["Follow Up"], 0);       // and not stage value either
  assert.equal(d.dataQuality.flags.suspiciousValue, 2);
  assert.equal(d.dataQuality.flags.suspiciousClosed, 1);
  assert.equal(d.dataQuality.flags.suspiciousClosedAmount, 145000);
});

test("the suspicious limit is 10 times the typical (median) deal", () => {
  const d = run([lead({ value: 1000 }), lead({ value: 2000 }), lead({ value: 3000 })]);
  assert.equal(d.dataQuality.typicalDeal, 2000);
  assert.equal(d.dataQuality.suspiciousAbove, 20000);
});

test("a closed deal worth $0 counts as a sale with no revenue", () => {
  const d = run([lead({ stage: "Closed", value: 0, source: "Webinar" }), lead({ stage: "Closed", value: 4000, source: "Webinar" })]);
  const w = src(d, "Webinar");
  assert.equal(w.closedDeals, 2);
  assert.equal(w.revenue, 4000);
  assert.equal(d.dataQuality.flags.zeroValueWins, 1);
});

test("each stage counts toward the right funnel steps (exits stop there)", () => {
  const steps = (stage) => run([lead({ stage })]).sources[0].funnel;
  assert.deepEqual(steps("Qualified Opt In"), [1, 0, 0, 0]);
  assert.deepEqual(steps("Disqualified"), [1, 0, 0, 0]);
  assert.deepEqual(steps("Booked call"), [1, 1, 0, 0]);
  assert.deepEqual(steps("Cancelled"), [1, 1, 0, 0]);
  assert.deepEqual(steps("No Show"), [1, 1, 0, 0]);
  assert.deepEqual(steps("Follow Up"), [1, 1, 1, 0]);
  assert.deepEqual(steps("Lost"), [1, 1, 1, 0]);
  assert.deepEqual(steps("Closed"), [1, 1, 1, 1]);
});

test("the stage wins when the status disagrees", () => {
  const d = run([lead({ stage: "Disqualified", status: "open" }), lead({ stage: "Closed", status: "won" })]);
  assert.equal(d.dataQuality.flags.stageStatusMismatch, 1);
  assert.equal(d.sources[0].stages["Disqualified"], 1);
});

test("duplicate contacts are counted once, keeping the one furthest in the funnel", () => {
  const d = run([
    lead({ email: "same@example.com", stage: "Booked call", source: "Referral" }),
    lead({ email: "SAME@example.com ", stage: "Closed", source: "Referral" }),
    lead({ phone: "+961 70 123 456", stage: "Lost", source: "Referral" }),
    lead({ phone: "0096170123456", stage: "Qualified Opt In", source: "Referral" }),
  ]);
  assert.equal(d.dataQuality.removed["Duplicate contact"], 2);
  const r = src(d, "Referral");
  assert.equal(r.leads, 2);
  assert.equal(r.stages["Closed"], 1);
  assert.equal(r.stages["Lost"], 1);
});

test("source spellings are merged and a missing source is shown as Unknown source", () => {
  assert.equal(cleanSource("FB"), "Facebook Ad");
  assert.equal(cleanSource(" facebook ad "), "Facebook Ad");
  assert.equal(cleanSource("Website"), "Website Form");
  assert.equal(cleanSource(""), UNKNOWN_SOURCE);
  assert.equal(cleanSource(null), UNKNOWN_SOURCE);
  const d = run([lead({ source: "FB" }), lead({ source: "Facebook Ad" }), lead({ source: null })]);
  assert.equal(src(d, "Facebook Ad").leads, 2);
  assert.equal(src(d, UNKNOWN_SOURCE).leads, 1);
});

test("a source with no closed deals shows $0 and no broken percentages", () => {
  const d = run([lead({ source: "Cold Email", stage: "Qualified Opt In" }), lead({ source: "Billboard", stage: "Closed", value: 3000 })]);
  const c = src(d, "Cold Email");
  assert.equal(c.revenue, 0);
  assert.equal(c.revenuePerLead, 0);
  assert.equal(c.conversion[1].rate, null);           // 0 of 0 booked → no %, not NaN
  assert.equal(d.sources.at(-1).source, "Cold Email"); // sorted last by revenue
});

test("stage counts add up to each source's total and to the overall total", () => {
  const leads = STAGE_NAMES.flatMap((stage, i) => [lead({ stage, source: i % 2 ? "Webinar" : "Billboard" })]);
  const d = run(leads);
  assert.equal(d.checks.stagesAddUpPerSource, true);
  assert.equal(d.checks.sourcesAddUpToTotal, true);
  assert.equal(d.totals.leads, 8);
});

test("the output carries no names, emails, phones or record ids", () => {
  const l = lead({ name: "Cedar Consulting - Carla Gerges", email: "carla@example.com", phone: "+96170000000" });
  const text = JSON.stringify(run([l]));
  for (const secret of ["Carla", "carla@example.com", "+96170000000", `"${l.opp.id}"`, `"${l.contact.id}"`])
    assert.ok(!text.includes(secret), `leaked: ${secret}`);
});

// Real data: only runs on a computer where scripts/ghl-profile.mjs has saved data/raw/.
const RAW = path.join(process.cwd(), "data", "raw");
const hasRaw = fs.existsSync(path.join(RAW, "opportunities.json"));
test("real GHL data: 238 records become 204 agency leads and $190,750 revenue", { skip: !hasRaw && "no data/raw files on this computer" }, () => {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(RAW, f), "utf8"));
  const sales = read("pipelines.json").find((p) => p.name.trim().toLowerCase() === "sales pipeline" && p.stages.length === 8);
  const d = buildDashboard({ stages: sales.stages, opportunities: read("opportunities.json"), contacts: read("contacts.json") });
  assert.equal(d.dataQuality.started, 238);
  assert.equal(d.dataQuality.kept, 204);
  assert.equal(d.totals.revenue, 190750);
  assert.equal(d.totals.closedDeals, 28);
  assert.equal(d.dataQuality.flags.suspiciousValue, 6);
  assert.ok(Object.values(d.checks).every(Boolean));
});
