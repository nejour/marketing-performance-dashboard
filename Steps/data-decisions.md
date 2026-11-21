# Project 1: Data decisions (Steps 4 and 5), draft

Based on `Steps/data-profile.md` and the raw data pulled on 2026-11-21 (238 opportunities in the 8-stage "Sales Pipeline").
Each line below is a decision with its reason. Copy them into the README once you agree with them.

---

## Step 4: Which records belong to this agency

**Rule:** *Agency records = opportunities in the 8-stage "Sales Pipeline" whose contact carries the tag `dash-project`.*

**Why:** all 204 `dash-project` records were loaded together by the same integration on 2026-09-04, use the agency's 9 lead sources and have no test markers. Everything else in the pipeline was added separately and has its own giveaway:

| Group in the Sales Pipeline | Records | How you can tell | Decision |
|---|---|---|---|
| Tag `dash-project` | **204** | Bulk import on 2026-09-04, 9 clean sources | **Keep (agency data)** |
| Tags `demo-data` + `sandbox` | 32 | Separate import on 2026-09-01; all sit in "Disqualified" while their status says won/open/abandoned; only group using "Instagram DM"; 3 of them copy agency contacts under a second email | Exclude: "demo / sandbox data" |
| Tag `leadpulse-test` | 1 | Named "TEST - LeadPulse Website Inquiry", `demo@example.com`, $100, source "Website" | Exclude: "test lead" |
| No tags | 1 | "Dane Halt-Home sale": added by hand on 2026-10-30 by another sandbox user, no source, $0, real gmail address | Exclude: "added by another user" |

The other 23 pipelines in the location (e.g. "JH-Speed to Lead", "Fitness Coaching Pipeline") belong to other students and are never read.

**Data quality line for the dashboard:** *Started with 238 → removed 32 demo/sandbox, 1 test lead, 1 added by another user → 204 agency leads.*

---

## Step 5: Cleaning rules inside the 204 agency records

| # | What we found | Records | Proposed decision | Why |
|---|---|---|---|---|
| 1 | Duplicate contacts (same email or phone) | 0 | No action. The 3 look-alike people (Nadia Attieh, Mona Haddad, Reem Rahme) are copies inside the demo group, already removed by the Step 4 rule | The agency's own records are unique |
| 2 | Missing source | 0 | Keep an "Unknown source" bar in the code anyway, so the totals still add up if one appears later | Future-proof; the brief says not every problem is listed |
| 3 | Same source spelled differently | 0 | Mapping table stays in code (e.g. "Website" → "Website Form", "FB" → "Facebook Ad") | Cheap guard for live data |
| 4 | **Deal value $145,000** | 6 (2 of them won: Facebook Ad, Instagram Ad) | **Keep the lead in volume and pipeline. Leave the value out of revenue** and list it as "suspicious value" | Normal deals are $1,500–$12,000 (median $6,875); $145,000 is 12× the largest normal deal and appears on exactly 6 records. Including it adds $290,000 of revenue to Facebook Ad and Instagram Ad and flips the budget advice |
| 5 | **Deal value $0** | 9 (1 won: Webinar) | Keep the lead. Count the won deal as a sale, add $0 revenue, flag it as "won with no value" | A $0 win is a real close with a missing amount; dropping it would understate Webinar's close rate |
| 6 | Stage "Disqualified" but status "open" | 2 | Trust the **stage**; count them as Disqualified | The stage is what the pipeline chart shows. One source of truth |
| 7 | Moved back to "Qualified Opt In" in October, after the import | 4 | Keep as-is, mention it in the README | Probably edited by another student. Read-only, so we can't fix it; the effect is small |

---

## Step 6 preview: how the funnel reads

The 8 stages are not in funnel order in GHL. What each stage means, matched to the stage definitions of a real agency pipeline (15 stages, shared in the course):

| Sandbox stage | Real-pipeline equivalent | Meaning | Funnel role |
|---|---|---|---|
| Qualified Opt In | Qualified - Opt Ins | Submitted the form and meets the criteria | Step 1 (everyone starts here) |
| Disqualified | DQ Opt Ins / Unqualified Prospects | Not eligible (e.g. revenue too low) | Exit at step 1 |
| Booked call | Appointment Set | Booked a call on the booking page | Step 2 |
| Cancelled | Canceled (NA) / Canceled (DQ) | Booking cancelled: no answer, or disqualified on the call-back | Exit at step 2 |
| No Show | No Show | Booked but didn't attend (the closer moves it by hand) | Exit at step 2 |
| Follow Up | Hot 7/30 days, Long-Term / Manual Follow Up | Had the call, not ready to buy yet | Step 3 (still open) |
| Closed | Closed Won | Paid us money | Step 4, the only stage that counts as revenue |
| Lost | Closed Lost | Sales process ended, the prospect said no | Exit at step 3 |

Proposed reading:

```
Qualified Opt In → Booked call → Call held → Closed
                 ↘ Disqualified  ↘ Cancelled / No Show   ↘ Lost
```

- **Reached "Booked call"** = Booked call + Cancelled + No Show + Follow Up + Lost + Closed
- **Reached "Call held"** = Follow Up + Lost + Closed
- **Reached "Closed"** = Closed
- Disqualified, Cancelled, No Show and Lost are **exits**, not steps forward.

Check across all 204 leads: 136 booked a call (67%) → 74 held the call (54% of booked) → 28 closed (38% of held).

### First look by source (rule 4 applied: $145k values left out)

| Source | Leads | Booked | Held | Closed | Revenue |
|---|---|---|---|---|---|
| Billboard | 24 | 19 | 11 | 4 | $40,000 |
| Webinar | 22 | 17 | 8 | 4 | $33,000 |
| Instagram Ad | 22 | 14 | 12 | 5 | $31,500 |
| LinkedIn Outreach | 16 | 10 | 8 | 2 | $20,000 |
| Referral | 30 | 23 | 9 | 3 | $19,250 |
| Google Search | 21 | 13 | 8 | 4 | $15,500 |
| Cold Email | 22 | 14 | 7 | 2 | $13,500 |
| Website Form | 23 | 8 | 4 | 1 | $11,000 |
| Facebook Ad | 24 | 18 | 7 | 3 | $7,000 |

If the $145k values were kept, Instagram Ad would jump to first place ($176,500) and Facebook Ad from last to second ($152,000). That's why rule 4 is the most important decision to explain in the README and show in the Loom.

---

## Decisions still yours to confirm

1. Rule 4: exclude the $145,000 values from revenue only (recommended), or drop those 6 leads entirely?
2. ~~Where "Lost" sits~~: settled. In the real agency pipeline, "Closed Lost" means the sales process ended and the prospect said no, so Lost comes after the call.
