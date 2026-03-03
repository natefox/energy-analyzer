# Energy Analyzer - Claude Code Guide

## Project Overview

Client-side Next.js app that compares utility rate plans and analyzes energy usage from CSV data. Supports SDG&E and SCE via a plugin architecture. Inspired by [sdge.ca](https://sdge.ca).

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

- `UtilityPlugin` — Plugin contract: CSV parsing, rate plans, TOU classification
- `IntervalRecord` — Normalized 15-min interval: date, startTime, endTime, consumption, generation, net
- `RatePlan` — Rate structure: id, name, monthlyCharge, baselineCredit?, seasons.summer/winter.periods
- `PeriodRate` — Rate for a TOU period: rate, fees?, label, hours (weekday/weekend ranges)
- `AnalysisResult` — Output of calculateCosts: dailyData[], totals, hourlyProfile, dateRange
- `DailyData` — Per-day aggregation: usage/cost/generation by peak/offPeak/superOffPeak/midPeak

### Shared Business Logic (src/lib/)

- `calculator.ts` — `calculateCosts(records, plan, plugin)` for CSV analysis; `calculatePlanComparison(plan, kWh, peakPct, season)` for parametric estimates
- `registry.ts` — `getPlugins()`, `getPlugin(id)`, `detectUtility(csvText)`
- `utils.ts` — formatCurrency, formatKwh, formatDate, periodColor, periodLabel

### Pages (src/app/)

- `/` — Landing page with CTAs
- `/compare` — Side-by-side plan comparison with utility toggle buttons, usage/peak sliders
- `/analyze` — CSV upload → auto-detect utility → rate schedule display, charts, usage summary, plan comparison table, personalized recommendations

### Components (src/components/)

- `CsvUploader` — Drag-drop + paste, calls detectUtility() then parseCsv()
- `RateScheduleDisplay` — Summer/winter rate cards for selected plan
- `UsageSummary` — TOU period breakdown with percentages, peak hour, lowest usage, most efficient time; solar generation summary when data present
- `PlanComparisonTable` — All plans ranked by cost using actual CSV data
- `UsageAdvice` — Data-driven personalized recommendations (plan switching, peak shifting, solar optimization, battery storage)
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
- Integration tests skip gracefully when CSV data files are absent (CI-safe)

## Design Doc

Full design and rate data details: `docs/plans/2026-03-03-energy-analyzer-design.md`
Implementation plan: `docs/plans/2026-03-03-energy-analyzer-implementation.md`
