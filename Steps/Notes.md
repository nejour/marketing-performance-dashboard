# Notes

## Read the GHL data (Step 3)

Run from the project folder:

```powershell
node --use-system-ca scripts/ghl-profile.mjs
```

- Read-only: it pulls the "Sales Pipeline", all its opportunities and their contacts from GoHighLevel. Nothing in GHL is changed.
- Output: the report in `Steps/data-profile.md` and the raw JSON in `data/raw/` (raw data is not pushed to GitHub).
- `--use-system-ca` is required on the work network. Without it Node can't verify the company's certificates and fails with `fetch failed`.
- The key comes from `.env` and is never printed.

## Check the cleaning rules (Steps 4–6)

```powershell
node scripts/check-clean.mjs
```

- Runs `lib/clean.mjs` (the dashboard's cleaning code) on the files in `data/raw/`. Works offline, nothing is sent anywhere.
- Prints: the data quality summary (238 → 204 and why), the funnel and revenue per source, the leads per stage, the consistency checks and the budget recommendation.
- Run the GHL command above first if you want fresh data.

## Open the dashboard on your computer (Step 8–9)

Live GHL data (same as the real site will show):

```powershell
npm run dev
```

(same as `node --use-system-ca scripts/serve.mjs`)

Offline (uses the files in `data/raw/`, no GHL call):

```powershell
node scripts/serve.mjs --offline
```

Then open http://localhost:3000 in your browser. Stop the server with Ctrl+C.

## Run the tests (Step 9)

```powershell
npm test
```

19 checks: the cleaning rules (agency filter, test/demo removal, $145,000 values, $0 wins, funnel steps, duplicates, source names, a source with no sales), the server function (wrong key, GHL down, nothing private sent to the browser), and the real numbers (238 → 204, $190,750) when `data/raw/` exists. All must say `pass`.

Files:
- `index.html`: the page the owner sees (charts drawn with Chart.js)
- `vendor/chart.umd.js`: Chart.js 4.4.1 (MIT licence), served from the site so no outside website is needed
- `fonts/`: the Public Sans font (SIL Open Font Licence), same reason
- `tests/`: the automated checks
- `api/dashboard.mjs`: the server function (holds the key, returns only totals). On Vercel it runs at `/api/dashboard`
- `lib/ghl.mjs`: read-only GHL calls
- `lib/clean.mjs`: the cleaning rules and calculations
- `scripts/serve.mjs`: local preview only (not used on Vercel)
