Now the Level 1 slides and Level 2 workflows, quickly.

I've read everything I need. Now I'll write the step-by-step plan.

I read the course material, the note and the Project 1 description, and saved the plan as **`Project-1-Step-by-Step-Plan.md`** in your `Project-1-Marketing-Performance-Dashboard` folder. I read Levels 1–4 and the webinar through the slides, n8n workflows, notes and prompt files. I didn't open the screenshot images, except the Supabase vs Neon one.

**What Project 1 asks for:** a live web dashboard, hosted outside GoHighLevel. It pulls the agency's leads from the GoHighLevel test account through its API and shows, separately for each lead source, four things:
- how many leads came in,
- where they sit in the 8-stage Sales Pipeline,
- the conversion rate from each stage to the next,
- how much revenue they closed.

The point is to tell the owner where to put next month's budget. Most of the real work is cleaning the data and explaining each choice you make.

**The plan's 13 steps:**
1. Read the rules: what to submit, how it's graded, and how to keep the API key safe.
2. Set up the project: a private GitHub repo and a `.env` file for the keys, using your Level 3 "Prompt 5".
3. Pull all the GoHighLevel data in read-only mode and profile it before building anything.
4. Decide which records belong to this agency, since the test account also holds other students' records.
5. Clean the data: remove duplicates, test leads, missing or misspelled sources and suspicious deal values, and count what you remove and why.
6. Define each number in plain English, including a check that the stage counts add up to each source's total.
7. Choose the setup: a Vercel server function holds the key and the browser only gets summary numbers.
8. Build it with Claude Code from one detailed prompt, which is written out for you in the plan.
9. Test the hard cases.
10. Deploy to Vercel.
11. Write the README.
12. Record the Loom (3 minutes max).
13. Submit.

Each step points back to the lesson it comes from, for example the Level 3 dashboard prompts and the deployment note.

**Security warning:** the `Projects/note` file has the test account's API key in plain text. Never commit that note or the `Projects` folder to GitHub. Keep the dashboard in its own private repo. A live link that exposes the key fails the project.


# Project 1: Marketing Performance Dashboard (Step-by-Step Plan)

**Goal in one sentence:** Build a live web page that the agency owner opens on Monday morning. By source, it shows how many leads came in, how far they got in the 8-stage Sales Pipeline, where they dropped off, and how much money they closed, so the owner knows where to put next month's budget.

**Tools:** GoHighLevel API + Claude Code (+ GitHub + Vercel).

---

## 0. How this project uses what you learned

| What you learned | Where it is | How Project 1 uses it |
|---|---|---|
| MAP framework (Map → Advise → Prioritize) | Webinar | The dashboard maps the data (volume, pipeline), advises on it (conversion, revenue), and prioritizes it with a "where to put budget" line |
| APIs, HTTP requests, JSON | Level 1 – 2, 3 | You *pull* (HTTP GET) opportunities and contacts from GHL and get JSON back |
| Webhooks vs HTTP requests | Level 1 – 2 | Use this when you decide between live refresh and scheduled refresh (pull on a schedule, not push) |
| What is data / input → process → output | Level 1 – 3 | Raw GHL data → clean + exclude → charts |
| Workflows without AI ("not everything needs AI") | Level 1 – 5 | Data cleaning is rule-based, so no LLM is needed inside the dashboard |
| n8n workflows | Level 1 – 6, Level 2 | Optional: a scheduled n8n flow that snapshots GHL into Supabase/Sheets |
| Prompt engineering + context | Level 1 – 1 | You write one strong, structured build prompt for Claude Code |
| Building a dashboard with Claude Code | Level 3 – 3 | Same pattern: build prompt, then `.env` for keys, then live GHL data, then tag/source filtering, then a "how each number is worked out" footer |
| Backend server that hides the GHL token | Level 3 – 2 (`server.js`) | The browser never sees the key. A server function calls GHL |
| Deployment (GitHub → Vercel → env vars) | Level 3 – 0 | Same steps to get the live, shareable link |
| GHL pipelines, stages, opportunities, tags, sources | Level 4 | You need to understand what each of the 8 stages means and how leads move through them |

---

## 1. Read the rules before you touch anything (from `Projects/note`)

**What you must submit:**
1. **A live link** to the dashboard.
2. **A README** that explains how it works and lists every decision you made, with a one-line reason for each.
3. **A Loom video** (3 minutes max, in English) that shows the dashboard working, *including the hard cases*.

**How it's graded:**
- It works end to end.
- It survives the hard cases.
- Your decisions are justified.
- A non-technical person can use it without you there.

**Sandbox rules (the GHL account is shared with other students):**
- Only **read** data. Never edit or delete anything that isn't yours.
- If you create anything, prefix it with your initials (e.g. `NJ-`).
- Use made-up data only.

**Security (an exposed key means automatic failure):**
- The GHL API key must **never** appear in browser code, screenshots, the Loom, or a public repo.
- ⚠️ The `Projects/note` file contains the sandbox API key in plain text. Never commit the `Projects` folder or that note to GitHub. Keep the dashboard in its own repo.

---

## 2. Set up your workspace

1. Create the project folder (this folder). Open it in Claude Code.
2. Create a **private** GitHub repo, e.g. `marketing-performance-dashboard`.
3. Ask Claude Code to set up the keys safely (this reuses your Level 3 "Prompt 5"):

   > Create a `.env` file in the project root with `GHL_API_KEY=` and `GHL_LOCATION_ID=` left blank for me to fill in. Add `.env` and `.env.local` to `.gitignore`. Create a `.env.example` with the same names and no values. Never read or print `.env`. Tell me which file and line to paste my key into.

4. Paste the key and Location ID from the pinned message into `.env` yourself.

---

## 3. Explore the GHL data (read-only) before building anything

**Why first:** the brief says "the real work" is the data, so look at the data before you design anything.

Ask Claude Code:

> Using the GHL API (base `https://services.leadconnectorhq.com`, Bearer token from `.env`, `Version: 2021-07-28` header), READ ONLY:
> 1. List all pipelines for my location and their stages in order. Find the 8-stage "Sales Pipeline".
> 2. Download ALL opportunities in that pipeline (handle pagination, so don't stop at the first page) and all their contacts.
> 3. Save the raw responses to `data/raw/` as JSON (and add `data/raw/` to `.gitignore`).
> 4. Give me a profiling report: total records; counts by stage; counts by source (exact spellings); tags seen; date range of creation; monetary value stats (min/max/median, zeros, negatives); how many share the same email or phone; names/emails that look like tests; any fields that could tell one student's/agency's records from another.
> Do not create, update or delete anything in GHL.

Write down what you find. Every finding becomes a decision in your README.

---

## 4. Decide which records belong to "this agency"

The sandbox has other students' records mixed in. Look for what separates them, for example:
- **Pipeline:** only opportunities in the 8-stage Sales Pipeline.
- **Date window:** the agency ran ads for 3 months, so check the creation dates.
- **Name / tag prefixes:** other students use initials like `AB-`. Those records aren't the agency's.
- **Tags, custom fields or the "source" field** that only the real agency's leads have.

Write the rule in one plain sentence. For example: *"Agency records = opportunities in the 'Sales Pipeline' created between X and Y whose names don't carry a student prefix."* Show the owner how many records the rule removed.

---

## 5. Clean the data, and track every record you remove

Build a cleaning step that runs **in order**, labels each removed record with a reason, and counts them. Look at least for the following (the brief says not every problem is listed, so look for more):

| Problem | How to spot it | Suggested decision (you choose, then justify it) |
|---|---|---|
| Other students' records | Prefixes, wrong pipeline, outside the date window | Exclude: "not this agency" |
| Duplicate contacts | Same email (lower-cased, trimmed) or same phone (digits only) | Keep the record that went furthest in the pipeline (or the oldest). Exclude the rest as "duplicate" |
| Test / internal leads | "test", "asdf" or "demo" in the name; `@example.com`, `@test.com` or the agency's own domain; fake phones like 0000000 | Exclude: "test/internal" |
| Missing source | Empty source field | **Don't hide them.** Show an "Unknown source" bar so the totals still add up, or exclude them and say so. Pick one and justify it |
| Same source spelled differently | "facebook", "Facebook Ads", "FB", "fb-ads" | Map them to one clean name. Put the mapping table in the README |
| Suspicious deal values | 0 or negative on a won deal; huge outliers (e.g. 999999); a value far above the normal deal size | Exclude from revenue only, or the whole record. Explain the cutoff you used |
| Stage/status mismatch | Status "won" but the stage isn't Closed (or the reverse) | Pick one source of truth (e.g. stage) and flag the rest |
| Opportunity with no contact | No contact ID / deleted contact | Exclude: "orphan record" |

**Output:** a "Data quality" table that the dashboard shows: *Started with N records → removed X duplicates, Y tests, Z not-this-agency… → N kept.*

---

## 6. Define each number in plain English (before coding the charts)

All metrics are **by source** with no blended totals. Every chart lets the owner compare Source A vs B vs C side by side.

1. **Lead volume** = the number of cleaned leads per source.
2. **Pipeline progression** = how many leads from each source are *currently* in each of the 8 stages.
   - **Consistency check:** for each source, the stage counts must add up to that source's lead volume, and all sources must add up to the total. Build this check into the code and show a ✅ on the page.
3. **Stage-to-stage conversion** = of the leads that *reached* stage N, the % that *reached* stage N+1.
   - "Reached" means currently in that stage **or any later stage**. Decide how to treat "lost/DQ/no-show" type stages, which are exits and not steps forward, and write that down.
   - Show the count behind each % (e.g. "40% (12 of 30)") so small numbers don't mislead.
4. **Closed revenue** = the sum of deal values for won/closed deals per source, sorted highest first.
5. **Budget signal** (optional, but this is what the owner actually wants): revenue per lead and close rate per source, and a one-line plain-English recommendation such as *"Referral brings the most revenue per lead; Google Ads brings volume but rarely closes."* There is no ad spend, so don't talk about ROAS.

---

## 7. Choose the architecture (your call, so justify it)

**Recommended simple setup (the same pattern as Level 3):**

```
Browser (HTML + Chart.js)  →  /api/dashboard (Vercel serverless function, holds GHL key)
                                   → calls GHL API, paginates, cleans, aggregates
                                   → returns only the summary numbers (no names, no key)
```

- **Refresh:** "live with a short cache". Data is fetched when the page opens, cached for about 15–60 minutes so you don't hammer the API, and the page shows "Last updated: …".
  - Alternative: an n8n schedule (Level 2 style) that saves a snapshot to Supabase/Google Sheets every morning before Monday. It's more moving parts, but the page is faster.
- **Only return aggregates to the browser**, never raw contacts. That's privacy and security in one line for your README.
- **Optional:** a simple password, like the Level 3 "Prompt 10" login. If you add one, remember the owner must still open it with zero explanation.

---

## 8. Build it with Claude Code (one strong prompt)

Use the same consolidated-prompt style as your Level 3 dashboard. You can paste this and adjust it:

> Build a standalone marketing performance dashboard for an agency owner (non-technical) to check every Monday. Host on Vercel. The GHL key stays server-side in a serverless function. The browser only receives aggregated numbers.
>
> DATA: pull opportunities from the 8-stage "Sales Pipeline" and their contacts from the GHL API (credentials in `.env`). Handle pagination and API errors.
>
> CLEANING (in this order, count each): [paste your rules from steps 4–5]. Show a "Data quality" panel: started with N, removed X for reason A, Y for reason B…, kept M.
>
> SOURCE MAPPING: [paste your source name mapping]. Missing source → "Unknown source".
>
> LAYOUT, top to bottom (volume → pipeline → conversion → revenue):
> 1. A one-sentence plain-English summary + "Where to put next month's budget" recommendation.
> 2. Lead volume by source: bar chart.
> 3. Pipeline by source: stacked bar (one bar per source, segments = the 8 stages in order). Show a check that stage counts sum to each source's total.
> 4. Stage-to-stage conversion: a funnel per source side by side (same scale), each step showing % and "x of y".
> 5. Closed revenue by source: bar chart sorted highest to lowest.
> 6. Data quality panel.
> 7. Collapsible footer "How each number is worked out" with plain-English definitions.
>
> RULES: no pie charts, no combo charts, no blended totals, the same colour for each source on every chart, clear labels, no jargon, works on a phone. Show "Last updated" time and a friendly message if GHL can't be reached.

Then iterate in small prompts (fix one thing at a time), the same way you did with the RemotelyX website.

---

## 9. Test the hard cases (and record them for the Loom)

- [ ] **Totals add up:** stage sums = source totals = overall total (the on-page check shows ✅).
- [ ] **Pagination:** the record count matches what GHL shows (more than one page was fetched).
- [ ] **Duplicates / tests / other students' records** are removed and counted.
- [ ] **A source with 0 won deals** shows $0 and doesn't break the sorted chart.
- [ ] **A source with very few leads:** the conversion % shows "x of y" so it doesn't look misleadingly high.
- [ ] **GHL down / wrong key:** the page shows a friendly message, not a blank screen.
- [ ] **Security:** open the live site, then check View Source and DevTools → Network. There should be no key and no personal data, only aggregates.
- [ ] **Non-technical test:** give the link to someone with no explanation. Can they tell you which source to spend more on?

---

## 10. Deploy (the same steps as Level 3 – deployment)

1. Ask Claude Code: *"Push this to my private GitHub repo `<name>` on main. Confirm `.env` is NOT committed."*
2. In Vercel: **Add New → Project → Import** the repo.
3. Under **Environment Variables**, add `GHL_API_KEY` and `GHL_LOCATION_ID`.
4. Click **Deploy**. You get a `…vercel.app` link.
5. Open it in an incognito window and on your phone, then run the hard-case checks again on the live link.

---

## 11. Write the README

```
# Marketing Performance Dashboard
Live link: …

## How it works (3–5 lines)
Data source → cleaning → aggregation → charts; refresh method; where the key lives.

## Decisions (one line each: decision → why)
- Which records belong to the agency: … → because …
- Duplicates: kept the record that … → because …
- Test/internal leads: excluded if … → because …
- Missing source: … → because …
- Source name mapping: … → because …
- Suspicious deal values: excluded if … → because …
- "Reached a stage" means … ; exit stages treated as … → because …
- Refresh: live + N-min cache → because …
- Tech stack / hosting: … → because …
- Charts chosen: … → because the brief / owner readability …

## Data quality summary
Started N → removed … → kept M.
```

---

## 12. Record the Loom (≤ 3 min, English)

1. **0:00–0:20** The problem and who the dashboard is for.
2. **0:20–1:30** Walk top to bottom: volume → pipeline → conversion → revenue → recommendation.
3. **1:30–2:30** Hard cases: the data quality panel, totals adding up, the GHL-down message, and DevTools showing no key.
4. **2:30–3:00** Your 2–3 biggest decisions and why.

Don't show `.env`, the note file, or the key anywhere on screen.

---

## 13. Submit

In the Project 1 thread, post the **live link**, the **README** (repo link or file), and the **Loom link**. Then move to Project 2. Projects are done in number order and solo.
