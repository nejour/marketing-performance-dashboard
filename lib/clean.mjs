// Cleaning + aggregation for the Marketing Performance Dashboard.
// Input : raw GHL data (Sales Pipeline stages, its opportunities, their contacts).
// Output: ONLY summary numbers (no names, emails or phones), ready for the charts.
// Every rule below is explained in Steps/data-decisions.md.

// ---------- Settings (decisions) ----------
export const AGENCY_TAG = "dash-project";          // Step 4: agency records carry this contact tag
export const DEMO_TAGS = ["demo-data", "sandbox"];  // Step 4: separate demo import
export const TEST_TAGS = ["leadpulse-test"];        // Step 4: known test tag
export const SUSPICIOUS_MULTIPLIER = 10;            // Step 5: value > 10x the typical deal = suspicious

// Step 6: furthest funnel step each stage proves the lead reached
// 1 = Opted in, 2 = Booked a call, 3 = Had the call, 4 = Closed (paid)
export const STAGE_STEP = {
  "qualified opt in": 1,
  "disqualified": 1,      // exit at step 1
  "booked call": 2,
  "cancelled": 2,         // exit at step 2
  "no show": 2,           // exit at step 2
  "follow up": 3,
  "lost": 3,              // exit at step 3
  "closed": 4,
};
export const FUNNEL_STEPS = ["Opted in", "Booked a call", "Had the call", "Closed"];

// Step 5: the status each stage should have (stage is the source of truth)
const EXPECTED_STATUS = {
  "closed": "won", "lost": "lost", "disqualified": "lost",
  "cancelled": "abandoned", "no show": "abandoned",
};

// Step 5: one clean name per source (guards against spelling variants in live data)
const SOURCE_ALIASES = {
  "facebook": "Facebook Ad", "facebook ad": "Facebook Ad", "facebook ads": "Facebook Ad", "fb": "Facebook Ad", "fb ads": "Facebook Ad", "fb-ads": "Facebook Ad",
  "instagram": "Instagram Ad", "instagram ad": "Instagram Ad", "instagram ads": "Instagram Ad", "ig": "Instagram Ad",
  "google": "Google Search", "google search": "Google Search", "google ads": "Google Search",
  "website": "Website Form", "website form": "Website Form", "web form": "Website Form",
  "linkedin": "LinkedIn Outreach", "linkedin outreach": "LinkedIn Outreach",
  "referral": "Referral", "referrals": "Referral",
  "cold email": "Cold Email", "email": "Cold Email",
  "webinar": "Webinar", "billboard": "Billboard",
};
export const UNKNOWN_SOURCE = "Unknown source";

// ---------- helpers ----------
const lc = (s) => (s ?? "").toString().trim().toLowerCase();
const digits = (s) => (s ?? "").toString().replace(/\D/g, "");
const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
export function cleanSource(raw) {
  const k = lc(raw);
  if (!k) return UNKNOWN_SOURCE;
  return SOURCE_ALIASES[k] || raw.toString().trim();
}

// ---------- main ----------
// stages:        [{id, name, position}] of the Sales Pipeline
// opportunities: raw GHL opportunities of the Sales Pipeline
// contacts:      { contactId: rawContact }
export function buildDashboard({ stages, opportunities, contacts }) {
  const orderedStages = [...stages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const stageById = Object.fromEntries(orderedStages.map((s) => [s.id, s.name]));
  const removed = [];       // reason per excluded record
  const removedValue = {};  // reason -> total deal value of the excluded records
  const drop = (reason, o) => { removed.push(reason); removedValue[reason] = (removedValue[reason] || 0) + (Number(o.monetaryValue) || 0); };
  const flags = { suspiciousValue: 0, suspiciousAmount: 0, suspiciousClosed: 0, suspiciousClosedAmount: 0, zeroValueWins: 0, stageStatusMismatch: 0, sourceRenamed: 0 };
  const contactOf = (o) => contacts[o.contactId || o.contact?.id];

  // ---- Step 4 + 5: decide which records stay, in this order ----
  let kept = [];
  for (const o of opportunities) {
    const c = contactOf(o);
    const tags = (c?.tags || []).map(lc);
    const stage = stageById[o.pipelineStageId];
    const name = `${o.name || ""}`;
    const email = lc(c?.email);
    if (!stage) { drop("Not in the Sales Pipeline stages", o); continue; }
    if (!c) { drop("No contact linked (orphan record)", o); continue; }
    if (tags.some((t) => TEST_TAGS.includes(t)) || /^\s*test\b/i.test(name) || email.startsWith("test@") || email === "demo@example.com") {
      drop("Test lead", o); continue;
    }
    if (tags.some((t) => DEMO_TAGS.includes(t))) { drop("Demo / sandbox data", o); continue; }
    if (!tags.includes(AGENCY_TAG)) { drop("Not this agency's data (added by another user)", o); continue; }
    kept.push({ o, c, stage });
  }

  // ---- Step 5: duplicates (same email or same phone) -> keep the one furthest in the funnel, then the oldest ----
  const seen = new Map();
  const rank = (r) => [-(STAGE_STEP[lc(r.stage)] || 0), new Date(r.o.createdAt || 0).getTime()];
  const better = (a, b) => { const ra = rank(a), rb = rank(b); return ra[0] !== rb[0] ? ra[0] < rb[0] : ra[1] <= rb[1]; };
  const keys = (r) => [lc(r.c.email) && "e:" + lc(r.c.email), digits(r.c.phone).length >= 7 && "p:" + digits(r.c.phone).slice(-9)].filter(Boolean);
  const dropped = new Set();
  for (const r of kept) {
    for (const k of keys(r)) {
      const prev = seen.get(k);
      if (!prev) { seen.set(k, r); continue; }
      if (dropped.has(prev) || prev === r) continue;
      if (better(r, prev)) { dropped.add(prev); seen.set(k, r); } else dropped.add(r);
    }
  }
  for (const r of dropped) drop("Duplicate contact", r.o);
  kept = kept.filter((r) => !dropped.has(r));

  // ---- Step 5: suspicious deal values (kept as leads, excluded from revenue) ----
  const positive = kept.map((r) => Number(r.o.monetaryValue) || 0).filter((v) => v > 0);
  const typicalDeal = median(positive);
  const suspiciousAbove = typicalDeal * SUSPICIOUS_MULTIPLIER;

  // ---- Step 6: aggregate per source ----
  const bySource = new Map();
  const blank = (source) => ({
    source, leads: 0,
    stages: Object.fromEntries(orderedStages.map((s) => [s.name, 0])),
    stageValues: Object.fromEntries(orderedStages.map((s) => [s.name, 0])),   // deal value per stage (suspicious values left out)
    funnel: [0, 0, 0, 0],
    closedDeals: 0, revenue: 0, zeroValueWins: 0, suspiciousValues: 0, suspiciousAmount: 0,
  });
  for (const { o, stage } of kept) {
    const source = cleanSource(o.source);
    if (o.source && source !== o.source.toString().trim()) flags.sourceRenamed++;
    if (!bySource.has(source)) bySource.set(source, blank(source));
    const s = bySource.get(source);
    s.leads++;
    s.stages[stage]++;
    const step = STAGE_STEP[lc(stage)] || 1;
    for (let i = 0; i < step; i++) s.funnel[i]++;

    const expected = EXPECTED_STATUS[lc(stage)] || "open";
    if (lc(o.status) !== expected) flags.stageStatusMismatch++;

    const value = Number(o.monetaryValue) || 0;
    const suspicious = value > suspiciousAbove;
    if (!suspicious) s.stageValues[stage] += value;
    if (suspicious) {
      s.suspiciousValues++; s.suspiciousAmount += value; flags.suspiciousValue++; flags.suspiciousAmount += value;
      if (lc(stage) === "closed") { flags.suspiciousClosed++; flags.suspiciousClosedAmount += value; }
    }
    if (lc(stage) === "closed") {
      s.closedDeals++;
      if (value === 0) { s.zeroValueWins++; flags.zeroValueWins++; }
      if (!suspicious) s.revenue += value;
    }
  }

  const sources = [...bySource.values()].map((s) => ({
    ...s,
    conversion: s.funnel.slice(1).map((n, i) => ({
      from: FUNNEL_STEPS[i], to: FUNNEL_STEPS[i + 1], count: n, of: s.funnel[i],
      rate: s.funnel[i] ? n / s.funnel[i] : null,
    })),
    closeRate: s.leads ? s.closedDeals / s.leads : 0,
    revenuePerLead: s.leads ? s.revenue / s.leads : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // ---- Consistency checks (shown with a tick on the page) ----
  const leadsTotal = sources.reduce((a, s) => a + s.leads, 0);
  const checks = {
    stagesAddUpPerSource: sources.every((s) => Object.values(s.stages).reduce((a, b) => a + b, 0) === s.leads),
    sourcesAddUpToTotal: leadsTotal === kept.length,
    keptPlusRemovedIsRaw: kept.length + removed.length === opportunities.length,
  };

  const removedByReason = {};
  for (const r of removed) removedByReason[r] = (removedByReason[r] || 0) + 1;

  return {
    stages: orderedStages.map((s) => s.name),
    funnelSteps: FUNNEL_STEPS,
    sources,
    totals: {
      leads: leadsTotal,
      revenue: sources.reduce((a, s) => a + s.revenue, 0),
      closedDeals: sources.reduce((a, s) => a + s.closedDeals, 0),
    },
    dataQuality: {
      started: opportunities.length,
      removed: removedByReason,
      removedValue,
      startedValue: opportunities.reduce((a, o) => a + (Number(o.monetaryValue) || 0), 0),
      keptValue: kept.reduce((a, r) => a + (Number(r.o.monetaryValue) || 0), 0),
      kept: kept.length,
      typicalDeal,
      suspiciousAbove,
      flags,
    },
    checks,
    recommendation: recommend(sources),
  };
}

// One plain-English budget line, based on revenue per lead (there is no ad-spend data).
export function recommend(sources) {
  const ranked = sources.filter((s) => s.leads >= 5).sort((a, b) => b.revenuePerLead - a.revenuePerLead);
  if (ranked.length < 2) return "Not enough data yet to compare sources.";
  const money = (v) => "$" + Math.round(v).toLocaleString("en-US");
  const top = ranked.slice(0, 2), bottom = ranked.slice(-2).reverse();
  return `Put more of next month's budget into ${top[0].source} (${money(top[0].revenuePerLead)} earned per lead) and ${top[1].source} (${money(top[1].revenuePerLead)} per lead). ` +
    `Review ${bottom[0].source} (${money(bottom[0].revenuePerLead)} per lead) and ${bottom[1].source} (${money(bottom[1].revenuePerLead)} per lead): they bring leads but little revenue.`;
}
