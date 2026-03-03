# Energy Analyzer - Claude Code Guide

## Project Overview

Client-side Next.js app that compares utility rate plans and analyzes energy usage from CSV data. Supports SDG&E and SCE via a plugin architecture. Includes NEM tier support (NEM1/NEM2/NEM3), solar ROI calculator, optimal solar+battery sizing guide, and battery storage analyzer. Inspired by [sdge.ca](https://sdge.ca).

## Commands

- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Production build (static export to `out/`)
- `npm test` — Run all tests (Jest, 42 unit tests + 12 integration tests that auto-skip without CSV files)
- `npx jest path/to/test.ts` — Run a specific test file

## Tech Stack

- **Framework:** Next.js 14 (App Router) with static export (`output: "export"`)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 (uses `@import "tailwindcss"` not `@tailwind` directives)
- **Charts:** Recharts v3
- **CSV Parsing:** Papa Parse
- **Testing:** Jest with ts-jest

## Architecture

### Plugin System

Each utility is a self-contained plugin in `src/plugins/<utility>/`:

```
src/plugins/<utility>/
├── index.ts    — UtilityPlugin interface implementation
├── parser.ts   — CSV detection (detectCsv) and parsing (parseCsv) → IntervalRecord[]
├── plans.ts    — Rate plan data (RatePlan[])
├── tou.ts      — TOU period classifier (classifyInterval) + season classifier (getSeason)
└── __tests__/  — Unit tests + integration tests with real CSV files
```

Plugins are registered in `src/lib/registry.ts`. To add a new utility, create its plugin directory and register it there.

### Key Interfaces (src/lib/types.ts)

- `UtilityPlugin` — Plugin contract: CSV parsing, rate plans, TOU classification, nemConfig
- `IntervalRecord` — Normalized 15-min interval: date, startTime, endTime, consumption, generation, net
- `RatePlan` — Rate structure: id, name, monthlyCharge, baselineCredit?, seasons.summer/winter.periods
- `PeriodRate` — Rate for a TOU period: rate, fees?, label, hours (weekday/weekend ranges)
- `AnalysisResult` — Output of calculateCosts: dailyData[], totals, hourlyProfile, dateRange, totalExportCredit, netCost, nemTier
- `DailyData` — Per-day aggregation: usage/cost/generation/exportCredit by peak/offPeak/superOffPeak/midPeak
- `NemTier` — "none" | "NEM1" | "NEM2" | "NEM3" — controls solar export credit calculation
- `NemConfig` — Per-utility NEM rates: nem2NbcRate, nem3ExportRates by season/period

### Shared Business Logic (src/lib/)

- `calculator.ts` — `calculateCosts(records, plan, plugin, nemTier)` for CSV analysis; `calculatePlanComparison(plan, kWh, peakPct, season)` for parametric estimates; `getExportCreditRate()` helper for NEM tier-specific export credits
- `registry.ts` — `getPlugins()`, `getPlugin(id)`, `detectUtility(csvText)`
- `utils.ts` — formatCurrency, formatKwh, formatDate, periodColor, periodLabel

### Pages (src/app/)

- `/` — Landing page with CTAs
- `/compare` — Side-by-side plan comparison with utility toggle buttons, usage/peak sliders
- `/analyze` — CSV upload → auto-detect utility → NEM tier selector (auto-detects solar) → rate schedule display, charts, usage summary, plan comparison table, personalized recommendations, optimal sizing guide, solar ROI calculator, battery analyzer

### Components (src/components/)

- `CsvUploader` — Drag-drop + paste, calls detectUtility() then parseCsv()
- `RateScheduleDisplay` — Summer/winter rate cards for selected plan
- `UsageSummary` — TOU period breakdown with percentages, peak hour, lowest usage, most efficient time; solar generation summary and export credit card when data present
- `PlanComparisonTable` — All plans ranked by cost using actual CSV data; shows Grid Cost/Export Credit/Net Cost columns when NEM export credits exist
- `UsageAdvice` — Data-driven personalized recommendations (plan switching, peak shifting, solar optimization, battery storage, NEM3-specific advice); uses netCost for plan comparison
- `BatteryAnalyzer` — Battery ROI calculator with presets and custom specs, estimates savings/payback/10-year ROI
- `SolarAnalyzer` — Solar ROI calculator simulating hourly production using SoCal profile; preset sizes (4-12 kW) + custom; handles both new solar and additional panels; NEM 3.0 export rates; 25-year ROI with panel degradation
- `OptimalSizingGuide` — Sweeps 30+ solar (0-16 kW) x battery (0-13.5 kWh) combinations with per-interval simulation including battery charge/discharge; finds best ROI, fastest payback, best solar-only, max bill reduction; sortable comparison table (default: payback); natural language recommendations
- `PlanComparison` / `PlanCard` — Parametric comparison on /compare page
- `charts/DailyUsageChart` — Stacked bars by TOU period + solar generation (negative bars when present)
- `charts/DailyCostChart`, `HourlyDistributionChart` — Recharts stacked bars

## Utility-Specific Notes

### SDG&E
- 13 plans: 6 TOU, 4 tiered, 3 EV
- Summer: Jun-Oct, Winter: Nov-May
- Peak: 4-9pm all days
- CSV: 14 header rows, columns: Meter Number, Date, Start Time, Duration, Consumption, Generation, Net
- Detection: row containing "Meter Number" + "Date" + "Start Time"

### SCE
- 3 active plans: TOU-D-4-9PM (default), TOU-D-5-8PM, TOU-D-PRIME
- Summer: Jun-Sep, Winter: Oct-May
- Summer differentiates weekday peak vs weekend mid-peak
- Winter has superOffPeak (8am-4pm) that SDG&E doesn't
- TOU-D-4-9PM and TOU-D-5-8PM have $0.10/kWh baseline credit; TOU-D-PRIME does not
- CSV: ~11 header rows, all values quoted with trailing spaces, columns: Date, Energy Consumption time Period Start, Energy Consumption time Period End, Delivered, Received
- Detection: row containing "Energy Consumption time Period Start"

## NEM Tier System

- **NEM1**: Full retail rate credit for exported solar (legacy, grandfathered)
- **NEM2**: Retail rate minus non-bypassable charges (~$0.025/kWh) for exports
- **NEM3** (Net Billing Tariff): Time-varying avoided cost rates for exports (~$0.03-0.08/kWh depending on season/period)
- Auto-detected: if CSV has solar generation data, defaults to NEM2; otherwise "none"
- User can override via selector on analyze page
- New solar installations are automatically on NEM3
- NEM config per utility in plugin's `nemConfig`: `nem2NbcRate` + `nem3ExportRates[season][period]`

## Solar/Battery Constants

- Solar installed cost: $3.00/W
- Peak sun hours: 5.5/day (SoCal average)
- System efficiency: 85%
- Annual panel degradation: 0.5%/yr
- Battery cost: $1,100/kWh installed
- Battery round-trip efficiency: 90%
- Solar hourly profile: bell curve peaking 10am-1pm (SoCal)
- Federal ITC: **removed** (expired)

## CI/CD & Workflows

- `.github/workflows/deploy.yml` — Auto-deploy to GitHub Pages on push to main (preserves PR previews)
- `.github/workflows/ci.yml` — CI checks on PRs targeting main (lint, test, build)
- `.github/workflows/pr-preview.yml` — Deploy PR previews to `gh-pages/pr-preview/pr-<N>/`
- `.github/workflows/pr-preview-cleanup.yml` — Remove preview on PR close
- `.github/workflows/docker-publish.yml` — Build and publish Docker image to GHCR
- `.github/workflows/rate-check.yml` — Weekly Monday cron; checks git history for last modification date of `plans.ts` files; creates/updates GitHub issue if >90 days stale
- `scripts/check-rates.ts` — Rate freshness checker used by rate-check workflow

## Conventions

- Brand color is emerald (not blue) to differentiate from sdge.ca
- All processing is client-side — no server API routes
- "use client" directive on all interactive components
- TDD for business logic (parsers, TOU classifiers, calculator)
- Integration tests use real CSV files in project root (gitignored)
- Commit messages follow conventional commits: feat/fix/test/docs/chore
- Static export compatible with GitHub Pages
- `basePath` is `/energy-analyzer` in production only (env-conditional in next.config.ts) — dev runs at `/`
- GitHub Pages auto-deploys from main via `.github/workflows/deploy.yml`
- Live site: https://natefox.github.io/energy-analyzer/
- Docker: `docker compose up` or pull from `ghcr.io/natefox/energy-analyzer`
- Integration tests skip gracefully when CSV data files are absent (CI-safe)
- Feature work done in git worktrees under `.worktrees/` directory

## Design Doc

Full design and rate data details: `docs/plans/2026-03-03-energy-analyzer-design.md`
Implementation plan: `docs/plans/2026-03-03-energy-analyzer-implementation.md`
