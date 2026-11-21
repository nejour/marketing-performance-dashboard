Project 1: Marketing Performance Dashboard
GoHighLevel API + Claude Code

Background: An agency has run paid acquisition for three months but has no consolidated view of what's working. All data lives in GoHighLevel: leads, sources and an 8-stage Sales Pipeline. Build a dashboard the owner can check Monday morning and instantly know where to put next month's budget.

Deliver: a live, shareable link the owner opens in a browser. Standalone web dashboard, not built inside GHL.

Data: pull it from the GHL sandbox via the API (credentials in the pinned message). The sandbox is shared, so it also holds other students' records: deciding which records belong to this agency is part of the job. There is no ad spend data; base budget advice on volume, conversion and revenue.

Must show (all by source, never combined totals):
Lead volume
Pipeline progression through the 8 stages
Stage-to-stage conversion rates
Closed revenue

Segmentation rule: no single blended numbers. Every metric lets the owner compare Source A vs. B vs. C directly.

Data quality (the real work): the data is messy. Expect problems such as duplicate contacts, test/internal leads, missing sources and suspicious deal values. Not every problem is listed. Find what's there, decide what to exclude, justify each exclusion, and show the owner how many records you removed and why.

Charts:
Volume by source → bar chart
Pipeline distribution → stacked bar or funnel
Conversion rates → funnel chart
Revenue by source → sorted bar chart
No pie charts with many slices, no overloaded combo charts

Consistency rule: stage breakdowns must sum to reported totals.

Your call: tech stack, hosting, live vs. scheduled refresh, exclusion rules, layout.

Audience: a non-technical owner understands it with zero explanation. Clear labels, no jargon, and a logical flow: volume → pipeline → conversion → revenue.