# Energy Analyzer — Design Document

**Date:** 2026-03-03
**Status:** Approved

## Goal

Recreate sdge.ca's "Compare Plans" and "Analyze Usage" pages locally, extended to support both SDG&E and Southern California Edison (SCE) via a plugin architecture that allows adding more utilities in the future.

## Tech Stack

- Next.js (App Router) with static export for GitHub Pages
- Tailwind CSS for styling
- Recharts for charts
- Papa Parse for CSV parsing
- TypeScript

## Architecture: Utility Plugin System

Each utility implements a `UtilityPlugin` interface providing:

- **CSV detection & parsing** — detect whether a CSV belongs to this utility, parse into normalized `IntervalRecord[]`
- **Rate plans** — array of `RatePlan` objects with season/TOU-period rates
- **TOU classification** — given a datetime, return which TOU period it falls in
- **Season classification** — given a month, return summer or winter
- **Download instructions** — steps for users to get their CSV from the utility portal

A shared `calculator.ts` module takes normalized interval data + a rate plan and computes costs. Chart components render whatever data the calculator produces.

### Plugin Interface

```typescript
interface UtilityPlugin {
  id: string;
  name: string;
  shortName: string;
  detectCsv(text: string): boolean;
  parseCsv(text: string): IntervalRecord[];
  plans: RatePlan[];
  defaultPlanId: string;
  classifyInterval(date: Date, hour: number): TouPeriod;
  getSeason(month: number): "summer" | "winter";
  downloadInstructions: string[];
  downloadUrl: string;
}
```

### Normalized Data Model

```typescript
interface IntervalRecord {
  date: Date;
  startTime: Date;
  endTime: Date;
  consumption: number;  // kWh delivered
  generation: number;   // kWh exported (solar)
  net: number;          // consumption - generation
}

interface RatePlan {
  id: string;
  name: string;
  description: string;
  eligibility?: string;
  monthlyCharge: number;
  baselineCredit?: number;
  seasons: {
    summer: SeasonRates;
    winter: SeasonRates;
  };
}

interface SeasonRates {
  months: number[];
  periods: Record<TouPeriod, PeriodRate>;
}

interface PeriodRate {
  rate: number;
  fees?: number;
  hours: TouSchedule;
}
```

## Routing

| Route | Page |
|-------|------|
| `/` | Landing page — utility overview + CTAs |
| `/compare` | Compare rate plans (utility selected via header or auto-detected) |
| `/analyze` | Analyze usage from CSV upload |

A utility selector in the header lets users switch manually. Uploading a CSV auto-detects the utility.

## CSV Formats

### SDGE
- 14 header rows, then: `Meter Number, Date, Start Time, Duration, Consumption, Generation, Net`
- Date: `M/D/YYYY`, Time: `H:MM AM/PM`
- Detection signature: row containing "Meter Number" + "Date" + "Start Time"

### SCE
- ~11 header rows, then: `Date, Energy Consumption time Period Start, Energy Consumption time Period End, Delivered, Received`
- All values quoted with trailing spaces
- Date/time: `"MM/DD/YYYY HH:MMAM/PM "`
- Detection signature: row containing "Energy Consumption time Period Start"

## Rate Plans

### SDGE (13 plans)
Tiered: DR, DR-LI, DR-LI-CARE, DR-MB
TOU: TOU-DR1 (default), TOU-DR, TOU-DR-CARE, DR-SES, TOU-DR-SES, TOU-ELEC
EV: EV-TOU, EV-TOU-2, EV-TOU-5

SDGE summer: June-October. Winter: November-May.
Peak: 4-9pm all days.
Off-peak: 6am-4pm & 9pm-midnight weekdays; 2-4pm & 9pm-midnight weekends.
Super off-peak: midnight-6am weekdays; midnight-2pm weekends.

### SCE (3 active plans)

**TOU-D-4-9PM** (default)
- Monthly: $24.15, Baseline credit: $0.10/kWh
- Summer (Jun-Sep): Weekday peak (4-9pm) $0.58, Weekend mid-peak (4-9pm) $0.46, Off-peak $0.34
- Winter (Oct-May): Mid-peak (4-9pm) $0.51, Super off-peak (8am-4pm) $0.33, Off-peak $0.37

**TOU-D-5-8PM**
- Monthly: $24.15, Baseline credit: $0.10/kWh
- Summer: Weekday peak (5-8pm) $0.74, Weekend mid-peak (5-8pm) $0.54, Off-peak $0.34
- Winter: Mid-peak (5-8pm) $0.60, Super off-peak (8am-5pm) $0.32, Off-peak $0.38

**TOU-D-PRIME** (requires EV/battery/heat pump)
- Monthly: $24.15, No baseline credit
- Summer: Weekday peak (4-9pm) $0.59, Weekend mid-peak (4-9pm) $0.40, Off-peak $0.26
- Winter: Mid-peak (4-9pm) $0.56, Super off-peak (8am-4pm) $0.24, Off-peak $0.24

SCE summer: June-September. Winter: October-May.
SCE differentiates weekday vs weekend rates in summer (weekday on-peak > weekend mid-peak).

## Cost Calculation

### Analyze Page (actual CSV data)
1. For each interval: determine season → TOU period → look up rate
2. Cost = consumption × (rate + fees)
3. For SCE: apply baseline credit to usage within baseline allocation
4. Aggregate by day for charts, sum for totals

### Compare Page (parametric model)
- User inputs: monthly kWh, peak %, season, fixed charge tier
- Split: peak % of usage at peak rate; remaining 60% off-peak, 40% super off-peak
- Total = Σ(kWh × rate) + monthly charge
- Savings badge when difference > $5/month between compared plans

## Deployment

Static export via `output: 'export'` in next.config.js. Compatible with GitHub Pages. All processing is client-side.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── compare/page.tsx
│   └── analyze/page.tsx
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── UtilitySelector.tsx
│   ├── CsvUploader.tsx
│   ├── PlanCard.tsx
│   ├── PlanComparison.tsx
│   ├── UsageDashboard.tsx
│   └── charts/
│       ├── DailyUsageChart.tsx
│       ├── DailyCostChart.tsx
│       └── HourlyDistributionChart.tsx
├── lib/
│   ├── types.ts
│   ├── registry.ts
│   ├── calculator.ts
│   └── utils.ts
└── plugins/
    ├── sdge/
    │   ├── index.ts
    │   ├── parser.ts
    │   ├── plans.ts
    │   └── tou.ts
    └── sce/
        ├── index.ts
        ├── parser.ts
        ├── plans.ts
        └── tou.ts
```
