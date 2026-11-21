# Marketing Performance Dashboard

Live link: https://marketing-performance-dashboard-delta.vercel.app/

## How it works

When the page opens, it calls a small server function on Vercel (`api/dashboard.mjs`). That function reads the Sales Pipeline from GoHighLevel, cleans the data (`lib/clean.mjs`) and sends back only totals per source. The page then draws the charts with Chart.js.

The GHL key is saved in Vercel's environment variables, so it never reaches the browser. If GHL can't be reached, the owner sees a short message instead of a blank page.

### When the numbers update

The page gets its numbers when it is opened or reloaded. It does not update by itself while it stays open.

GHL is not called on every visit. The numbers are saved for a set time, 15 minutes by default (the `CACHE_MINUTES` setting):

- If the saved numbers are newer than that, they are shown straight away and GHL is not called.
- If they are older, GHL is called and the page shows fresh numbers.
- If nobody opens the page, GHL is never called.

The line at the top, "updated … at …", shows when the numbers were last taken from GHL. Example: the owner opens the page at 09:00 and sees "updated at 09:00". Reloading at 09:10 still shows 09:00. Reloading at 09:30 shows 09:30.

I did this to keep the page fast, to avoid sending the shared GHL account the same request over and over, and because the budget decision is made weekly, so numbers a few minutes old are fine.

## Decisions

Which data I used
- I only read the 8-stage "Sales Pipeline", because the other 23 pipelines belong to other students (their names start with initials like "JH-").
- I kept only contacts tagged `dash-project` (204 leads), because they were all imported together on 4 Sep and use the agency's 9 sources.
- I removed 32 records tagged `demo-data` and `sandbox`, because they came from a separate import, all sit in "Disqualified" with mismatched statuses, and 3 of them duplicate agency contacts.
- I removed the "TEST - LeadPulse" record, because it's clearly a test (demo email, $100).
- I removed "Dane Halt", because another user added it by hand in October, with no tag and no source.

Cleaning
- Deals above 10x the typical deal ($72,500) stay in the lead counts but not in revenue, because six deals are exactly $145,000 when every other deal is between $1,500 and $12,000.
- A won deal with a $0 value counts as a sale with $0 revenue, because the sale happened and only the amount is missing.
- When the stage and status disagree, I go by the stage, because that's what the pipeline chart shows.
- Duplicates (same email or phone) would be counted once, because one person shouldn't count twice. None exist today.
- Different spellings of a source would be merged and empty sources shown as "Unknown source", so the totals always add up. None exist today.

Numbers
- The funnel is Opted in, Booked a call, Had the call, Closed, because GHL's stages aren't in funnel order.
- Disqualified, Cancelled, No Show and Lost count as exits, not steps forward, because those leads stopped there.
- Each conversion % shows the count behind it, for example "58% (11 of 19)", because small sources can look better than they are.
- Revenue only counts the Closed stage, because that's the only stage where the client paid.
- The budget advice compares revenue per lead, because there's no ad-spend data.
- Every number is split by source with no blended total, because the owner needs to compare sources.

Setup
- Vercel function plus one HTML page, because it keeps the key on the server and costs nothing.
- Live data with a short cache instead of a scheduled job, because 238 records load fast and the owner always sees current numbers. The cache time is a setting, so it can be changed without touching the code.
- Only totals go to the browser, so no lead names or emails can leak.
- No password, because the page only shows totals and the owner should open it without any setup.
- Chart.js and the font are part of the site, so the page still works if outside websites are blocked.

## Data quality

I started with 238 records in the Sales Pipeline. I removed 32 demo records, 1 test lead and 1 record from another user, which left 204 agency leads.

Inside those 204, six $145,000 values are left out of the amounts. Two of them were closed deals, so $290,000 doesn't count as revenue. Final result: 28 closed deals and $190,750 in revenue.

I checked this against GHL. Filtering the Sales Pipeline by the tag `dash-project` gives the same stage counts, and adding "Value does not equal 145000" gives the same amounts.

## Testing

`npm test` runs 20 checks: each cleaning rule, a wrong key, GHL being down, no private data sent to the browser, a source with no sales, the cache setting, and the real totals.

## Settings

These go in `.env` on your computer, and in Environment Variables on Vercel (redeploy after changing them).

- `GHL_API_KEY`: the GoHighLevel key (required).
- `GHL_LOCATION_ID`: the GoHighLevel location (required).
- `CACHE_MINUTES`: how many minutes the numbers are reused before GHL is asked again (optional, 1 to 1440, default 15).

## Run it locally

Copy `.env.example` to `.env`, fill in the settings above, run `npm run dev` and open http://localhost:3000.
