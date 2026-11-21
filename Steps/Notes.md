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
