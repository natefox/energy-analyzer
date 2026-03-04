# Energy Analyzer

> Inspired by and built upon the excellent work at [sdge.ca](https://sdge.ca), particularly their [Compare SDG&E Plans](https://sdge.ca/compare-sdge-plans/) and [Analyze Energy Usage](https://sdge.ca/analyze-energy-usage/) tools. This project extends their concept to support multiple California utilities. Full credit to the sdge.ca team for the original idea and approach.

**Live site: [natefox.github.io/energy-analyzer](https://natefox.github.io/energy-analyzer/)**

## What is this?

Energy Analyzer is a client-side web app that helps California utility customers understand and optimize their electricity costs. It supports **San Diego Gas & Electric (SDG&E)** and **Southern California Edison (SCE)**, with a plugin architecture that makes it easy to add more utilities in the future.

Everything runs in your browser — no data is uploaded to any server.

## Features

### Compare Rate Plans

Side-by-side comparison of utility rate plans. Adjust your monthly usage, peak usage percentage, and season to see estimated costs across different plans.

- **SDG&E:** 13 plans (TOU, tiered, EV-specific)
- **SCE:** 3 active TOU plans (TOU-D-4-9PM, TOU-D-5-8PM, TOU-D-PRIME)
- Savings badge highlights when one plan is significantly cheaper
- Switch between utilities with toggle buttons

### Analyze Your Usage

Upload your utility's CSV export to see exactly how your energy costs break down:

- **Auto-detects** whether your CSV is from SDG&E or SCE
- Daily usage breakdown chart (stacked by TOU period)
- Daily cost breakdown chart
- Average hourly usage profile (weekday vs weekend)
- Rate schedule display with summer/winter rate cards
- Usage summary: per-period kWh and cost breakdowns, peak hour, lowest usage window
- Rate plan comparison table: all plans ranked by total cost using your actual data
- **Solar generation support**: if your CSV includes generation data, see daily production, TOU-period breakdown, solar offset percentage, and net export/grid usage
- **NEM tier support**: select your Net Energy Metering tier (NEM 1.0, 2.0, or 3.0) to see accurate export credits applied to cost calculations. Auto-detects solar and defaults to NEM 2.0. NEM 3.0 shows significantly lower export rates with advice to maximize self-consumption.
- **Personalized recommendations**: data-driven advice on plan switching, peak shifting, solar self-consumption, battery storage, NEM-aware optimization, and more
- **Optimal solar + battery sizing**: automatically simulates 30+ solar/battery combinations against your actual usage to find the best ROI, fastest payback, and maximum bill reduction. Shows detailed comparison table with all scenarios.
- **Solar ROI calculator**: estimate savings from adding solar panels (or more panels) based on your actual usage under NEM 3.0. Preset system sizes (4-12 kW) or custom, with 30% federal ITC, 25-year ROI, self-consumption vs export breakdown.
- **Battery ROI calculator**: estimate savings, payback period, and 10-year ROI for home battery systems (presets for Tesla Powerwall, Enphase, Franklin, or custom specs)
- Switch between rate plans to compare what you'd pay on each

### Supported CSV Formats

- **SDG&E:** Green Button Download CSV from [myaccount.sdge.com](https://myaccount.sdge.com)
- **SCE:** Energy Usage CSV from [sce.com/mysce/myaccount](https://www.sce.com/mysce/myaccount)

## Running Locally

### Docker (quickest)

```bash
docker run -p 8080:8080 ghcr.io/natefox/energy-analyzer:main
```

Open [http://localhost:8080](http://localhost:8080). Or use docker compose, which pulls from GHCR by default:

```bash
docker compose up
```

To build and run a local version instead, edit `docker-compose.yml`: comment out the `image:` line and uncomment `build: .`, then run `docker compose up --build`.

### Node.js

**Prerequisites:** [Node.js](https://nodejs.org/) 18 or later

### Setup

```bash
git clone https://github.com/natefox/energy-analyzer.git
cd energy-analyzer
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Tests

```bash
npm test
```

### Code Formatting

The project uses [Prettier](https://prettier.io/) for consistent code formatting. A pre-commit git hook automatically formats staged files before each commit.

```bash
# Format all source files
npm run format

# Check formatting without modifying files
npm run format:check
```

The pre-commit hook runs automatically after `npm install` (via the `prepare` script). It formats any staged `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, and `.md` files using Prettier before committing.

### Production Build

```bash
npm run build
```

This generates a static site in the `out/` directory, suitable for hosting on GitHub Pages or any static file server.

### GitHub Pages Deployment

A GitHub Actions workflow is included at `.github/workflows/deploy.yml`. It automatically builds, tests, and deploys to GitHub Pages on every push to `main`.

**Setup steps:**

1. Push the repo to GitHub
2. Go to **Settings > Pages** and set source to **GitHub Actions**
3. Push to `main` — the workflow will deploy automatically

**Custom base path:** Set the `BASE_PATH` environment variable at build time (e.g., `BASE_PATH=/energy-analyzer npm run build`). The GitHub Pages workflow sets this automatically.

**Branch protection:** To require approved merges before deploying, go to **Settings > Branches > Add rule**, set the branch name pattern to `main`, and enable "Require a pull request before merging" with "Require approvals".

## Adding a New Utility

The plugin architecture makes this straightforward. Create a new directory under `src/plugins/` with four files:

- `parser.ts` — CSV detection and parsing into normalized `IntervalRecord[]`
- `tou.ts` — Time-of-use period and season classification
- `plans.ts` — Rate plan data
- `index.ts` — Plugin entry point implementing the `UtilityPlugin` interface

Then register it in `src/lib/registry.ts`. See the existing `sdge` and `sce` plugins for reference.

## Updating Rate Plans

When a utility publishes new rates, update the corresponding plan file:

- **SDG&E:** `src/plugins/sdge/plans.ts`
- **SCE:** `src/plugins/sce/plans.ts`

Each plan object follows the `RatePlan` interface defined in `src/lib/types.ts`. The key fields to update:

| Field | What it is |
|-------|-----------|
| `monthlyCharge` | Fixed monthly service fee |
| `baselineCredit` | Per-kWh credit subtracted from the rate (SCE only) |
| `seasons.summer.periods.peak.rate` | Energy rate in $/kWh for that period |
| `seasons.summer.periods.peak.fees` | Additional per-kWh delivery/infrastructure fees (SDG&E) |
| `seasons.summer.periods.peak.hours` | TOU hour windows (weekday/weekend `{start, end}` in 24h) |
| `seasons.summer.months` | Which months are summer (e.g., `[6,7,8,9,10]` for SDG&E) |

The same structure applies to `winter` and all other period keys (`offPeak`, `superOffPeak`, `midPeak`).

**Where to find current rates:**
- **SDG&E:** [sdge.com/regulatory-filing/tariff-schedules](https://www.sdge.com/regulatory-filing/tariff-schedules) — look for Schedule TOU-DR, EV-TOU, DR-SES, etc.
- **SCE:** [sce.com/residential/rates/Time-Of-Use-Residential-Rate-Plans](https://www.sce.com/residential/rates/Time-Of-Use-Residential-Rate-Plans)

After updating rates, run `npm test` to ensure nothing breaks, and manually verify a sample calculation against the utility's online calculator if available.

### Automated Rate Freshness Checks

A GitHub Actions workflow (`rate-check.yml`) runs every Monday and checks when rate files were last updated. If any rate file is older than 90 days, it automatically creates a GitHub issue with links to verify current rates.

You can also check locally:

```bash
npx ts-node scripts/check-rates.ts
```

## Tech Stack

- Next.js (App Router) with static export
- TypeScript
- Tailwind CSS
- Recharts
- Papa Parse
- Jest
- Prettier

## Disclaimer

This tool is not affiliated with SDG&E, SCE, or any utility company. Rate data is sourced from publicly available tariff schedules and may not reflect the most current rates. Always verify with your utility provider.
