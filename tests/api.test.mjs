// Tests for the server function api/dashboard.mjs, with GoHighLevel faked.
// Run from the project folder:   node --test tests/

import { test } from "node:test";
import assert from "node:assert/strict";

const KEY = "pit-test-key-should-never-leak";
const stages = ["Qualified Opt In", "Disqualified", "Booked call", "Closed", "Cancelled", "No Show", "Follow Up", "Lost"]
  .map((name, i) => ({ id: "st" + i, name, position: i }));

// A fake response object with the parts the handler uses.
function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b || ""; },
    json() { return JSON.parse(this.body); },
  };
}

let mode = "down";
globalThis.fetch = async (url, opts) => {
  assert.equal(opts.method, "GET", "only GET requests may reach GoHighLevel");
  assert.equal(opts.headers.Authorization, `Bearer ${KEY}`);
  if (mode === "down") throw new Error("network unreachable");
  if (mode === "bad-key") return new Response("{}", { status: 401 });
  const u = new URL(url);
  if (u.pathname.endsWith("/pipelines")) return Response.json({ pipelines: [{ id: "p1", name: "Sales Pipeline", stages }] });
  return Response.json({
    opportunities: [{ id: "o1", name: "Cedar Consulting - Carla Gerges", monetaryValue: 5000, pipelineStageId: "st3", status: "won",
      source: "Referral", contactId: "c1", contact: { id: "c1", email: "carla@example.com", tags: ["dash-project"] } }],
    meta: { total: 1 },
  });
};

const { default: handler } = await import("../api/dashboard.mjs");

test("without the GHL settings it explains that the dashboard is not set up", async () => {
  delete process.env.GHL_API_KEY; delete process.env.GHL_LOCATION_ID;
  const res = fakeRes();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 500);
  assert.match(res.json().message, /not set up/);
});

test("when GoHighLevel can't be reached it returns a friendly message", async () => {
  process.env.GHL_API_KEY = KEY; process.env.GHL_LOCATION_ID = "loc1";
  mode = "down";
  const res = fakeRes();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 502);
  assert.match(res.json().message, /couldn't reach GoHighLevel/);
  assert.ok(!res.body.includes(KEY));
});

test("when the key is refused it says so, without showing the key", async () => {
  mode = "bad-key";
  const res = fakeRes();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 502);
  assert.match(res.json().message, /refused/);
  assert.ok(!res.body.includes(KEY));
});

test("only GET is allowed", async () => {
  const res = fakeRes();
  await handler({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
});

test("with GoHighLevel up it returns totals only: no key, names or emails", async () => {
  mode = "up";
  const res = fakeRes();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.ok, true);
  assert.equal(body.totals.leads, 1);
  assert.equal(body.totals.revenue, 5000);
  for (const secret of [KEY, "Carla", "carla@example.com"]) assert.ok(!res.body.includes(secret), `leaked: ${secret}`);
  assert.match(res.headers["cache-control"], /s-maxage=900/);
});

test("if GoHighLevel goes down later, the last good numbers are shown and marked as old", async () => {
  mode = "down";
  // Force the 15-minute cache to look expired.
  const realNow = Date.now;
  Date.now = () => realNow() + 16 * 60 * 1000;
  try {
    const res = fakeRes();
    await handler({ method: "GET" }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().stale, true);
    assert.equal(res.json().totals.leads, 1);
  } finally { Date.now = realNow; }
});
