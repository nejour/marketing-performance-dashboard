# GHL data profile: Sales Pipeline

Generated 2026-11-21 14:31 UTC by `scripts/ghl-profile.mjs` (read-only). Raw JSON is in `data/raw/` (git-ignored).

## 1. Pipelines in this location

| Pipeline | Stages | Opportunities |
|---|---|---|
| Sales Pipeline ← used | 8 | 238 |
| My Sales Pipeline | 7 | 3 |
| Engineering Services – Sales | 9 | 2 |
| SG sales pipeline | 6 | 3 |
| OD_Questia | New Patient / Lead | 6 | 5 |
| HG - Speed to Lead | 9 | 5 |
| EM-Speed to Lead | 10 | 2 |
| test pipeline | 4 | 0 |
| EA-P2 Speed to Lead | 9 | 4 |
| GE - Speed to Lead | 9 | 1 |
| JH-Speed to Lead | 9 | 22 |
| IC -Speed-to-Lead | 10 | 0 |
| HG- Candidates | 7 | 0 |
| JJ | Speed to Lead | 6 | 0 |
| JJ | Speed to Lead 2 | 9 | 16 |
| GE-RC Candidates | 6 | 3 |
| Dental New Patient Pipeline | 5 | 1 |
| Real Estate Valuation Pipeline | 5 | 0 |
| EM - Candidate Pipeline | 7 | 3 |
| Fitness Coaching Pipeline | 5 | 16 |
| SG- Speed to lead | 9 | 4 |
| EM-Candidate Pipeline | 8 | 2 |
| Candidates | 6 | 1 |
| ER-Speed to Lead | 9 | 1 |

### Stages of "Sales Pipeline" (in order)

1. Qualified Opt In
2. Disqualified
3. Booked call
4. Closed
5. Cancelled
6. No Show
7. Follow Up
8. Lost

## 2. Totals

- Opportunities downloaded: **238** (GHL reports 238) ✅
- Unique contacts linked: **238**
- Opportunities with no contact ID: **0**
- Contacts that could not be fetched (deleted / no access): **0**

## 3. Counts by stage

| # | Stage | Count |
|---|---|---|
| 1 | Qualified Opt In | 46 |
| 2 | Disqualified | 56 |
| 3 | Booked call | 34 |
| 4 | Closed | 28 |
| 5 | Cancelled | 10 |
| 6 | No Show | 18 |
| 7 | Follow Up | 30 |
| 8 | Lost | 16 |

### Counts by status

| Status | Count |
|---|---|
| `open` | 130 |
| `lost` | 43 |
| `abandoned` | 33 |
| `won` | 32 |

### Stage × status (to spot mismatches, e.g. status won but stage not Closed)

| Stage | Status | Count |
|---|---|---|
| Qualified Opt In | open | 46 |
| Booked call | open | 34 |
| Follow Up | open | 30 |
| Closed | won | 28 |
| Disqualified | lost | 27 |
| Disqualified | open | 20 |
| No Show | abandoned | 18 |
| Lost | lost | 16 |
| Cancelled | abandoned | 10 |
| Disqualified | abandoned | 5 |
| Disqualified | won | 4 |

## 4. Sources (exact spellings)

### Opportunity `source` field

| Source | Count |
|---|---|
| `Referral` | 36 |
| `Facebook Ad` | 30 |
| `Website Form` | 26 |
| `Google Search` | 25 |
| `Cold Email` | 25 |
| `Webinar` | 24 |
| `Billboard` | 24 |
| `Instagram Ad` | 22 |
| `LinkedIn Outreach` | 18 |
| `Instagram DM` | 6 |
| *(missing)* | 1 |
| `Website` | 1 |

### Contact `source` field

| Source | Count |
|---|---|
| `Referral` | 36 |
| `Facebook Ad` | 30 |
| `Website Form` | 26 |
| `Google Search` | 25 |
| `Cold Email` | 25 |
| `Webinar` | 24 |
| `Billboard` | 24 |
| `Instagram Ad` | 22 |
| `LinkedIn Outreach` | 18 |
| `Instagram DM` | 6 |
| *(missing)* | 2 |

## 5. Contact tags

Opportunities whose contact has no tags: **1**

| Tag | Count |
|---|---|
| `dash-project` | 204 |
| `demo-data` | 32 |
| `sandbox` | 32 |
| `leadpulse-test` | 1 |

## 6. Creation dates

- Earliest: **2026-09-01**  ·  Latest: **2026-10-30**  ·  Missing date: 0

| Month | Opportunities |
|---|---|
| 2026-09 | 236 |
| 2026-10 | 2 |

## 7. Deal values (`monetaryValue`)

| Set | N | Min | Median | P90 | P99 | Max | Sum |
|---|---|---|---|---|---|---|---|
| All opportunities | 238 | 0 | 6,875 | 11,500 | 145,000 | 145,000 | 2,394,100 |
| Status = won | 32 | 0 | 8,875 | 11,500 | 145,000 | 145,000 | 511,250 |

- Missing / non-numeric value: **0**
- Zero: **10** (of which won: 1)
- Negative: **0**
- Above 10× the won median: **6**

### 10 largest values

| Value | Status | Stage | Source | Opportunity name |
|---|---|---|---|---|
| 145,000 | abandoned | Cancelled | `Billboard` | `Cedar Group - Jad Rustom` |
| 145,000 | won | Closed | `Facebook Ad` | `Cedar Consulting - Carla Gerges` |
| 145,000 | won | Closed | `Instagram Ad` | `Vertex Works - Farah Assaf` |
| 145,000 | lost | Disqualified | `Webinar` | `Atlas Solutions - Nadia Gerges` |
| 145,000 | lost | Disqualified | `Instagram Ad` | `Byblos Agency - Sara Tannous` |
| 145,000 | open | Follow Up | `Google Search` | `Horizon Labs - Zeina Nassar` |
| 12,000 | won | Closed | `LinkedIn Outreach` | `Lumen Group - Marc Helou` |
| 12,000 | lost | Disqualified | `Facebook Ad` | `Phoenix Media - Bilal Antoun` |
| 12,000 | lost | Disqualified | `Webinar` | `Summit Digital - Antoine Matar` |
| 12,000 | open | Qualified Opt In | `Facebook Ad` | `Forge Collective - Georges Chami` |

## 8. Duplicates

- Emails used by more than one opportunity: **0** groups, **0** opportunities
- Phones (last 9 digits) used by more than one opportunity: **0** groups, **0** opportunities
- Same contact ID on more than one opportunity: **0** contacts
- Opportunities with no email: **0** · no phone: **237**

## 9. Records that look like tests / internal

**237** opportunities matched test words, test email domains or fake phone numbers.

| Opportunity name | Email domain | Stage | Status |
|---|---|---|---|
| `TEST - LeadPulse Website Inquiry` | `example.com` | Qualified Opt In | open |
| `Lumen Digital - Walid Gerges` | `example.com` | Lost | lost |
| `Marina Partners - Ziad Sfeir` | `example.com` | Lost | lost |
| `Summit Digital - Karim Rizk` | `example.com` | Lost | lost |
| `Orbit Consulting - Rita Mansour` | `example.com` | Lost | lost |
| `Levant Labs - Dima Barakat` | `example.com` | Lost | lost |
| `Horizon Collective - Amal Maalouf` | `example.com` | Lost | lost |
| `Phoenix Digital - Racha Antoun` | `example.com` | Lost | lost |
| `Horizon Solutions - Racha Aoun` | `example.com` | Lost | lost |
| `Atlas Solutions - Lina Rustom` | `example.com` | Lost | lost |
| `Tide Consulting - Wassim Aoun` | `example.com` | Lost | lost |
| `Tide Consulting - Layal Sarkis` | `example.com` | Lost | lost |
| `Summit Labs - Mona Abboud` | `example.com` | Lost | lost |
| `Northstar Partners - Reem Maalouf` | `example.com` | Lost | lost |
| `Northstar Works - Marc Haddad` | `example.com` | Lost | lost |
| `Lumen Media - Omar Mansour` | `example.com` | Lost | lost |
| `Pillar Partners - Wassim Nader` | `example.com` | Lost | lost |
| `Byblos Labs - Reem Aziz` | `example.com` | Cancelled | abandoned |
| `Levant Group - Racha Gerges` | `example.com` | Cancelled | abandoned |
| `Beacon Ventures - Khalil Bou Khalil` | `example.com` | Cancelled | abandoned |
| `Summit Media - Hiba Barakat` | `example.com` | Cancelled | abandoned |
| `Cedar Group - Jad Rustom` | `example.com` | Cancelled | abandoned |
| `Vertex Solutions - Tala Nakhle` | `example.com` | Cancelled | abandoned |
| `Phoenix Digital - Imad Sfeir` | `example.com` | Cancelled | abandoned |
| `Basalt Collective - Sami Sleiman` | `example.com` | Cancelled | abandoned |
| `Beacon Agency - Karim Daher` | `example.com` | Cancelled | abandoned |
| `Byblos Ventures - Naji Barakat` | `example.com` | Cancelled | abandoned |
| `Atlas Ventures - Jad Chami` | `example.com` | Closed | won |
| `Orbit Partners - Tala Barakat` | `example.com` | Closed | won |
| `Copper Studio - Carla Ghanem` | `example.com` | Closed | won |
| `Cedar Consulting - Carla Gerges` | `example.com` | Closed | won |
| `Forge Collective - Leila Rahme` | `example.com` | Closed | won |
| `Basalt Collective - Joelle Matar` | `example.com` | Closed | won |
| `Copper Media - Reem Fares` | `example.com` | Closed | won |
| `Summit Media - Sara Rahme` | `example.com` | Closed | won |
| `Forge Solutions - Lina Aziz` | `example.com` | Closed | won |
| `Summit Agency - Leila Helou` | `example.com` | Closed | won |
| `Marina Digital - Dana Mansour` | `example.com` | Closed | won |
| `Vertex Partners - Sami Assaf` | `example.com` | Closed | won |
| `Anchor Studio - Jad Chidiac` | `example.com` | Closed | won |

### Email domains (top 25)

| Domain | Count |
|---|---|
| `example.com` | 237 |
| `gmail.com` | 1 |

## 10. Fields that could separate this agency's records from other students'

### Name prefixes (e.g. `AB-`)

| Prefix | Count |
|---|---|
| `(no prefix)` | 227 |
| `Tide` | 9 |
| `Dane` | 1 |
| `TEST` | 1 |

### Assigned user

| User ID | Count |
|---|---|
| `(unassigned)` | 237 |
| `FvtQ70GrbDSioma6Gizb` | 1 |

### Contact company name

| Company | Count |
|---|---|
| `Summit Digital` | 4 |
| `Summit Media` | 4 |
| `Basalt Collective` | 4 |
| `Summit Ventures` | 4 |
| `Phoenix Digital` | 3 |
| `Atlas Solutions` | 3 |
| `Byblos Labs` | 3 |
| `Atlas Ventures` | 3 |
| `Northstar Studio` | 3 |
| `Keystone Collective` | 3 |
| `Cedar Studio` | 3 |
| `Cedar Digital` | 3 |
| `Lumen Digital` | 2 |
| `Marina Partners` | 2 |
| `Orbit Consulting` | 2 |
| `Horizon Collective` | 2 |
| `Tide Consulting` | 2 |
| `Northstar Partners` | 2 |
| `Lumen Media` | 2 |
| `Beacon Ventures` | 2 |
| `Cedar Group` | 2 |
| `Byblos Ventures` | 2 |
| `Forge Collective` | 2 |
| `Copper Media` | 2 |
| `Forge Solutions` | 2 |

### Custom fields in use

_None._

## 11. Next

Turn each finding above into a decision (Step 4: which records are the agency's; Step 5: cleaning rules) and note it in the README.
