# Energy Analyzer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js app that compares utility rate plans and analyzes energy usage from CSV data, supporting SDG&E and SCE via a plugin architecture.

**Architecture:** Utility plugin system where each utility (SDGE, SCE) provides its own CSV parser, rate plans, and TOU classifier. A shared calculator and chart components render whatever the active plugin produces. Auto-detects utility from uploaded CSV.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, Recharts, Papa Parse, TypeScript, Jest

**Design doc:** `docs/plans/2026-03-03-energy-analyzer-design.md`

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `postcss.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js with TypeScript and Tailwind**

Run:
```bash
cd /Users/nfox/github/energy-analyzer
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

When prompted, accept defaults. If directory is not empty, say yes to proceed.

**Step 2: Install dependencies**

Run:
```bash
npm install recharts papaparse lodash
npm install -D @types/papaparse @types/lodash jest @jest/globals ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom @types/jest
```

**Step 3: Configure Next.js for static export**

Replace `next.config.ts` contents with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
```

**Step 4: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
```

Add to `package.json` scripts:
```json
"test": "jest",
"test:watch": "jest --watch"
```

**Step 5: Verify it builds**

Run: `npm run build`
Expected: Build succeeds, `out/` directory created.

**Step 6: Commit**

```bash
git init
echo "node_modules/\n.next/\nout/" > .gitignore
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, Recharts, Papa Parse"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Write the type definitions**

```typescript
// src/lib/types.ts

export type TouPeriod = "peak" | "offPeak" | "superOffPeak" | "midPeak";

export type Season = "summer" | "winter";

export type DayType = "weekday" | "weekend";

export interface IntervalRecord {
  date: Date;
  startTime: Date;
  endTime: Date;
  consumption: number;
  generation: number;
  net: number;
}

export interface TouSchedule {
  weekday: { start: number; end: number }[];
  weekend: { start: number; end: number }[];
}

export interface PeriodRate {
  rate: number;
  fees?: number;
  label: string;
  hours: TouSchedule;
}

export interface SeasonRates {
  months: number[];
  periods: Record<string, PeriodRate>;
}

export interface RatePlan {
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

export interface UtilityPlugin {
  id: string;
  name: string;
  shortName: string;
  detectCsv(text: string): boolean;
  parseCsv(text: string): IntervalRecord[];
  plans: RatePlan[];
  defaultPlanId: string;
  classifyInterval(date: Date, hour: number): string;
  getSeason(month: number): Season;
  summerMonths: number[];
  downloadInstructions: string[];
  downloadUrl: string;
}

export interface DailyData {
  date: string;
  peakCost: number;
  offPeakCost: number;
  superOffPeakCost: number;
  midPeakCost?: number;
  totalCost: number;
  peakUsage: number;
  offPeakUsage: number;
  superOffPeakUsage: number;
  midPeakUsage?: number;
  totalUsage: number;
  peakGeneration: number;
  offPeakGeneration: number;
  superOffPeakGeneration: number;
  totalGeneration: number;
}

export interface AnalysisResult {
  dailyData: DailyData[];
  totalCost: number;
  totalUsage: number;
  totalGeneration: number;
  avgDailyCost: number;
  avgDailyUsage: number;
  hourlyProfile: { weekday: number[]; weekend: number[] };
  dateRange: { start: string; end: string };
  daysAnalyzed: number;
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add core TypeScript type definitions"
```

---

### Task 3: SDGE TOU Classifier

**Files:**
- Create: `src/plugins/sdge/tou.ts`
- Create: `src/plugins/sdge/__tests__/tou.test.ts`

**Step 1: Write failing tests**

```typescript
// src/plugins/sdge/__tests__/tou.test.ts
import { classifyInterval, getSeason } from "../tou";

describe("SDGE TOU classifier", () => {
  describe("getSeason", () => {
    it("returns summer for June through October", () => {
      expect(getSeason(6)).toBe("summer");
      expect(getSeason(7)).toBe("summer");
      expect(getSeason(8)).toBe("summer");
      expect(getSeason(9)).toBe("summer");
      expect(getSeason(10)).toBe("summer");
    });

    it("returns winter for November through May", () => {
      expect(getSeason(11)).toBe("winter");
      expect(getSeason(12)).toBe("winter");
      expect(getSeason(1)).toBe("winter");
      expect(getSeason(5)).toBe("winter");
    });
  });

  describe("classifyInterval", () => {
    // Peak: 4pm-9pm all days
    it("classifies 5pm weekday as peak", () => {
      const date = new Date(2024, 6, 15, 17, 0); // Tue Jul 15 2025 5pm
      expect(classifyInterval(date, 17)).toBe("peak");
    });

    it("classifies 6pm weekend as peak", () => {
      const date = new Date(2024, 6, 13, 18, 0); // Sun Jul 13
      expect(classifyInterval(date, 18)).toBe("peak");
    });

    // Off-peak weekday: 6am-4pm and 9pm-midnight
    it("classifies 10am weekday as offPeak", () => {
      const date = new Date(2024, 6, 15, 10, 0);
      expect(classifyInterval(date, 10)).toBe("offPeak");
    });

    it("classifies 10pm weekday as offPeak", () => {
      const date = new Date(2024, 6, 15, 22, 0);
      expect(classifyInterval(date, 22)).toBe("offPeak");
    });

    // Super off-peak weekday: midnight-6am
    it("classifies 3am weekday as superOffPeak", () => {
      const date = new Date(2024, 6, 15, 3, 0);
      expect(classifyInterval(date, 3)).toBe("superOffPeak");
    });

    // Super off-peak weekend: midnight-2pm
    it("classifies 10am weekend as superOffPeak", () => {
      const date = new Date(2024, 6, 13, 10, 0); // Sunday
      expect(classifyInterval(date, 10)).toBe("superOffPeak");
    });

    // Off-peak weekend: 2pm-4pm and 9pm-midnight
    it("classifies 3pm weekend as offPeak", () => {
      const date = new Date(2024, 6, 13, 15, 0); // Sunday
      expect(classifyInterval(date, 15)).toBe("offPeak");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/plugins/sdge/__tests__/tou.test.ts`
Expected: FAIL — cannot find module `../tou`

**Step 3: Implement TOU classifier**

```typescript
// src/plugins/sdge/tou.ts
import type { Season } from "@/lib/types";

export function getSeason(month: number): Season {
  return month >= 6 && month <= 10 ? "summer" : "winter";
}

export function classifyInterval(date: Date, hour: number): string {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Peak: 4pm-9pm (hours 16-20) all days
  if (hour >= 16 && hour < 21) {
    return "peak";
  }

  if (isWeekend) {
    // Super off-peak: midnight-2pm (hours 0-13)
    if (hour < 14) return "superOffPeak";
    // Off-peak: 2pm-4pm (14-15) and 9pm-midnight (21-23)
    return "offPeak";
  }

  // Weekday
  // Super off-peak: midnight-6am (hours 0-5)
  if (hour < 6) return "superOffPeak";
  // Off-peak: 6am-4pm (6-15) and 9pm-midnight (21-23)
  return "offPeak";
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/plugins/sdge/__tests__/tou.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/sdge/tou.ts src/plugins/sdge/__tests__/tou.test.ts
git commit -m "feat: add SDGE TOU period classifier with tests"
```

---

### Task 4: SCE TOU Classifier

**Files:**
- Create: `src/plugins/sce/tou.ts`
- Create: `src/plugins/sce/__tests__/tou.test.ts`

**Step 1: Write failing tests**

```typescript
// src/plugins/sce/__tests__/tou.test.ts
import { classifyInterval, getSeason } from "../tou";

describe("SCE TOU classifier", () => {
  describe("getSeason", () => {
    it("returns summer for June through September", () => {
      expect(getSeason(6)).toBe("summer");
      expect(getSeason(9)).toBe("summer");
    });

    it("returns winter for October through May", () => {
      expect(getSeason(10)).toBe("winter");
      expect(getSeason(5)).toBe("winter");
    });
  });

  describe("classifyInterval for TOU-D-4-9PM schedule", () => {
    // Summer weekday peak: 4-9pm
    it("classifies 5pm summer weekday as peak", () => {
      const date = new Date(2025, 6, 15, 17, 0); // Tue Jul 15
      expect(classifyInterval(date, 17)).toBe("peak");
    });

    // Summer weekend mid-peak: 4-9pm
    it("classifies 5pm summer weekend as midPeak", () => {
      const date = new Date(2025, 6, 13, 17, 0); // Sun Jul 13
      expect(classifyInterval(date, 17)).toBe("midPeak");
    });

    // Summer off-peak: all other hours
    it("classifies 10am summer weekday as offPeak", () => {
      const date = new Date(2025, 6, 15, 10, 0);
      expect(classifyInterval(date, 10)).toBe("offPeak");
    });

    // Winter mid-peak: 4-9pm all days
    it("classifies 5pm winter as midPeak", () => {
      const date = new Date(2025, 0, 15, 17, 0); // Jan 15 Wed
      expect(classifyInterval(date, 17)).toBe("midPeak");
    });

    // Winter super off-peak: 8am-4pm all days
    it("classifies 10am winter as superOffPeak", () => {
      const date = new Date(2025, 0, 15, 10, 0);
      expect(classifyInterval(date, 10)).toBe("superOffPeak");
    });

    // Winter off-peak: midnight-8am and 9pm-midnight
    it("classifies 3am winter as offPeak", () => {
      const date = new Date(2025, 0, 15, 3, 0);
      expect(classifyInterval(date, 3)).toBe("offPeak");
    });

    it("classifies 10pm winter as offPeak", () => {
      const date = new Date(2025, 0, 15, 22, 0);
      expect(classifyInterval(date, 22)).toBe("offPeak");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/plugins/sce/__tests__/tou.test.ts`
Expected: FAIL — cannot find module

**Step 3: Implement SCE TOU classifier**

SCE's TOU classification is more complex because:
- Summer differentiates weekday (peak) vs weekend (midPeak) for the 4-9pm window
- Winter has no peak, only midPeak for 4-9pm, superOffPeak for 8am-4pm

The classifier uses TOU-D-4-9PM schedule (the default). TOU-D-5-8PM has different hours but we handle that by checking the plan's hour definitions at calculation time. For classification purposes, we use the default schedule and the calculator maps periods based on plan.

```typescript
// src/plugins/sce/tou.ts
import type { Season } from "@/lib/types";

export function getSeason(month: number): Season {
  return month >= 6 && month <= 9 ? "summer" : "winter";
}

export function classifyInterval(date: Date, hour: number): string {
  const month = date.getMonth() + 1;
  const season = getSeason(month);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (season === "summer") {
    // 4pm-9pm window
    if (hour >= 16 && hour < 21) {
      return isWeekend ? "midPeak" : "peak";
    }
    // All other hours: off-peak
    return "offPeak";
  }

  // Winter
  // 4pm-9pm: mid-peak (all days)
  if (hour >= 16 && hour < 21) {
    return "midPeak";
  }
  // 8am-4pm: super off-peak (all days)
  if (hour >= 8 && hour < 16) {
    return "superOffPeak";
  }
  // Midnight-8am and 9pm-midnight: off-peak
  return "offPeak";
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/plugins/sce/__tests__/tou.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/sce/tou.ts src/plugins/sce/__tests__/tou.test.ts
git commit -m "feat: add SCE TOU period classifier with tests"
```

---

### Task 5: SDGE CSV Parser

**Files:**
- Create: `src/plugins/sdge/parser.ts`
- Create: `src/plugins/sdge/__tests__/parser.test.ts`

**Step 1: Write failing tests**

Use a minimal fixture string that mimics the real SDGE CSV format (14 header rows + data).

```typescript
// src/plugins/sdge/__tests__/parser.test.ts
import { detectCsv, parseCsv } from "../parser";

const SAMPLE_CSV = `Name,Test User,,,,,
Address,123 Main St,,,,,
Account Number,12345,,,,,
Disclaimer,Test disclaimer,,,,,
Title,CSV Export Electric Meter(s),,,,,
Resource,Electric,,,,,
Meter Number,M001,,,,,
Interval UOM,Minute(s),,,,,
Reading Start,5/25/2024 0:00,,,,,
Reading End,5/26/2024 23:45,,,,,
Total Duration,2 Days,,,,,
Total Usage,10.5,,,,,
UOM,kWh,,,,,
Meter Number,Date,Start Time,Duration,Consumption,Generation,Net
M001,5/25/2024,12:00 AM,15,0.02,0,0.02
M001,5/25/2024,12:15 AM,15,0.03,0,0.03
M001,5/25/2024,8:00 AM,15,0,0.12,-0.12`;

describe("SDGE CSV parser", () => {
  describe("detectCsv", () => {
    it("detects SDGE CSV format", () => {
      expect(detectCsv(SAMPLE_CSV)).toBe(true);
    });

    it("rejects non-SDGE CSV", () => {
      expect(detectCsv("Date,Start,End,Delivered,Received")).toBe(false);
    });
  });

  describe("parseCsv", () => {
    it("parses interval records from SDGE CSV", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records).toHaveLength(3);
    });

    it("extracts consumption correctly", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[0].consumption).toBe(0.02);
      expect(records[1].consumption).toBe(0.03);
    });

    it("extracts generation correctly", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[2].generation).toBe(0.12);
      expect(records[2].net).toBe(-0.12);
    });

    it("parses dates correctly", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[0].startTime.getMonth()).toBe(4); // May = 4
      expect(records[0].startTime.getDate()).toBe(25);
      expect(records[0].startTime.getHours()).toBe(0);
      expect(records[0].startTime.getMinutes()).toBe(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/plugins/sdge/__tests__/parser.test.ts`
Expected: FAIL

**Step 3: Implement parser**

```typescript
// src/plugins/sdge/parser.ts
import Papa from "papaparse";
import type { IntervalRecord } from "@/lib/types";

export function detectCsv(text: string): boolean {
  const lines = text.split("\n").slice(0, 20);
  return lines.some(
    (line) =>
      line.includes("Meter Number") &&
      line.includes("Date") &&
      line.includes("Start Time")
  );
}

function parseTime(dateStr: string, timeStr: string): Date {
  // dateStr: "M/D/YYYY", timeStr: "H:MM AM" or "H:MM PM"
  const [month, day, year] = dateStr.split("/").map(Number);
  const timeParts = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeParts) throw new Error(`Invalid time: ${timeStr}`);

  let hours = parseInt(timeParts[1], 10);
  const minutes = parseInt(timeParts[2], 10);
  const ampm = timeParts[3].toUpperCase();

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes);
}

export function parseCsv(text: string): IntervalRecord[] {
  const lines = text.split("\n");

  // Find the header row
  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (
      lines[i].includes("Meter Number") &&
      lines[i].includes("Date") &&
      lines[i].includes("Start Time")
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) throw new Error("Could not find SDGE CSV header row");

  const csvContent = lines.slice(headerIndex).join("\n");
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const records: IntervalRecord[] = [];

  for (const row of parsed.data as Record<string, string>[]) {
    const date = row["Date"]?.trim();
    const startTimeStr = row["Start Time"]?.trim();
    const consumption = parseFloat(row["Consumption"]) || 0;
    const generation = parseFloat(row["Generation"]) || 0;
    const net = parseFloat(row["Net"]) || 0;

    if (!date || !startTimeStr) continue;

    const startTime = parseTime(date, startTimeStr);
    const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);

    records.push({
      date: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate()),
      startTime,
      endTime,
      consumption,
      generation,
      net,
    });
  }

  return records;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/plugins/sdge/__tests__/parser.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/sdge/parser.ts src/plugins/sdge/__tests__/parser.test.ts
git commit -m "feat: add SDGE CSV parser with tests"
```

---

### Task 6: SCE CSV Parser

**Files:**
- Create: `src/plugins/sce/parser.ts`
- Create: `src/plugins/sce/__tests__/parser.test.ts`

**Step 1: Write failing tests**

```typescript
// src/plugins/sce/__tests__/parser.test.ts
import { detectCsv, parseCsv } from "../parser";

const SAMPLE_CSV = `Energy Usage Information
"For location: 123 Main St"

Meter Reading Information
"Type of readings: Electricity"

Summary of Electric Power Usage Information*
"Your download will contain interval usage data."

Detailed Usage
"Start date: 2025-07-28 00:00:00  for 2 days"
Date,Energy Consumption time Period Start,Energy Consumption time Period End,Delivered,Received
"07/28/2025 ","07/28/2025 12:00AM ","07/28/2025 12:15AM ","0.480","0.000"
"07/28/2025 ","07/28/2025 12:15AM ","07/28/2025 12:30AM ","0.470","0.000"
"07/28/2025 ","07/28/2025 08:00AM ","07/28/2025 08:15AM ","0.000","0.340"`;

describe("SCE CSV parser", () => {
  describe("detectCsv", () => {
    it("detects SCE CSV format", () => {
      expect(detectCsv(SAMPLE_CSV)).toBe(true);
    });

    it("rejects non-SCE CSV", () => {
      expect(detectCsv("Meter Number,Date,Start Time")).toBe(false);
    });
  });

  describe("parseCsv", () => {
    it("parses interval records from SCE CSV", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records).toHaveLength(3);
    });

    it("maps Delivered to consumption", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[0].consumption).toBe(0.48);
    });

    it("maps Received to generation", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[2].generation).toBe(0.34);
      expect(records[2].consumption).toBe(0);
    });

    it("computes net correctly", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[2].net).toBeCloseTo(-0.34);
    });

    it("parses quoted datetime with trailing spaces", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[0].startTime.getMonth()).toBe(6); // July = 6
      expect(records[0].startTime.getDate()).toBe(28);
      expect(records[0].startTime.getHours()).toBe(0);
      expect(records[0].startTime.getMinutes()).toBe(0);
    });

    it("parses AM/PM times without space before meridian", () => {
      const records = parseCsv(SAMPLE_CSV);
      expect(records[2].startTime.getHours()).toBe(8);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/plugins/sce/__tests__/parser.test.ts`
Expected: FAIL

**Step 3: Implement parser**

```typescript
// src/plugins/sce/parser.ts
import Papa from "papaparse";
import type { IntervalRecord } from "@/lib/types";

export function detectCsv(text: string): boolean {
  const lines = text.split("\n").slice(0, 20);
  return lines.some((line) =>
    line.includes("Energy Consumption time Period Start")
  );
}

function parseSceDateTime(datetimeStr: string): Date {
  // Format: "MM/DD/YYYY HH:MMAM " or "MM/DD/YYYY H:MMPM "
  const cleaned = datetimeStr.replace(/"/g, "").trim();
  const match = cleaned.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(AM|PM)$/i
  );
  if (!match) throw new Error(`Invalid SCE datetime: ${datetimeStr}`);

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  let hours = parseInt(match[4], 10);
  const minutes = parseInt(match[5], 10);
  const ampm = match[6].toUpperCase();

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes);
}

export function parseCsv(text: string): IntervalRecord[] {
  const lines = text.split("\n");

  // Find header row with SCE column names
  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (lines[i].includes("Energy Consumption time Period Start")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) throw new Error("Could not find SCE CSV header row");

  const csvContent = lines.slice(headerIndex).join("\n");
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const records: IntervalRecord[] = [];

  for (const row of parsed.data as Record<string, string>[]) {
    const startStr =
      row["Energy Consumption time Period Start"]?.trim();
    const endStr =
      row["Energy Consumption time Period End"]?.trim();
    const delivered = parseFloat(
      (row["Delivered"] || "0").replace(/"/g, "").trim()
    );
    const received = parseFloat(
      (row["Received"] || "0").replace(/"/g, "").trim()
    );

    if (!startStr || !endStr) continue;

    const startTime = parseSceDateTime(startStr);
    const endTime = parseSceDateTime(endStr);

    records.push({
      date: new Date(
        startTime.getFullYear(),
        startTime.getMonth(),
        startTime.getDate()
      ),
      startTime,
      endTime,
      consumption: delivered,
      generation: received,
      net: delivered - received,
    });
  }

  return records;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/plugins/sce/__tests__/parser.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/sce/parser.ts src/plugins/sce/__tests__/parser.test.ts
git commit -m "feat: add SCE CSV parser with tests"
```

---

### Task 7: SDGE Rate Plans

**Files:**
- Create: `src/plugins/sdge/plans.ts`

**Step 1: Write SDGE rate plan data**

This encodes the 13 SDGE plans discovered from sdge.ca's JS bundles. Only the most commonly used plans are shown below for brevity — the full file should include all 13.

```typescript
// src/plugins/sdge/plans.ts
import type { RatePlan } from "@/lib/types";

export const sdgePlans: RatePlan[] = [
  {
    id: "TOU-DR1",
    name: "TOU-DR1",
    description: "Standard Time-of-Use plan. Most common residential TOU plan.",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: [6, 7, 8, 9, 10],
        periods: {
          peak: {
            rate: 0.70519,
            label: "Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          offPeak: {
            rate: 0.47575,
            label: "Off-Peak",
            hours: {
              weekday: [{ start: 6, end: 16 }, { start: 21, end: 24 }],
              weekend: [{ start: 14, end: 16 }, { start: 21, end: 24 }],
            },
          },
          superOffPeak: {
            rate: 0.35524,
            label: "Super Off-Peak",
            hours: {
              weekday: [{ start: 0, end: 6 }],
              weekend: [{ start: 0, end: 14 }],
            },
          },
        },
      },
      winter: {
        months: [11, 12, 1, 2, 3, 4, 5],
        periods: {
          peak: {
            rate: 0.56115,
            label: "Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          offPeak: {
            rate: 0.49928,
            label: "Off-Peak",
            hours: {
              weekday: [{ start: 6, end: 16 }, { start: 21, end: 24 }],
              weekend: [{ start: 14, end: 16 }, { start: 21, end: 24 }],
            },
          },
          superOffPeak: {
            rate: 0.48133,
            label: "Super Off-Peak",
            hours: {
              weekday: [{ start: 0, end: 6 }],
              weekend: [{ start: 0, end: 14 }],
            },
          },
        },
      },
    },
  },
  {
    id: "DR-SES",
    name: "DR-SES",
    description: "Solar/storage plan for NEM customers.",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: [6, 7, 8, 9, 10],
        periods: {
          peak: {
            rate: 0.38826,
            label: "Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          offPeak: {
            rate: 0.14305,
            label: "Off-Peak",
            hours: {
              weekday: [{ start: 6, end: 16 }, { start: 21, end: 24 }],
              weekend: [{ start: 14, end: 16 }, { start: 21, end: 24 }],
            },
          },
          superOffPeak: {
            rate: 0.06741,
            label: "Super Off-Peak",
            hours: {
              weekday: [{ start: 0, end: 6 }],
              weekend: [{ start: 0, end: 14 }],
            },
          },
        },
      },
      winter: {
        months: [11, 12, 1, 2, 3, 4, 5],
        periods: {
          peak: {
            rate: 0.16516,
            label: "Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          offPeak: {
            rate: 0.1185,
            label: "Off-Peak",
            hours: {
              weekday: [{ start: 6, end: 16 }, { start: 21, end: 24 }],
              weekend: [{ start: 14, end: 16 }, { start: 21, end: 24 }],
            },
          },
          superOffPeak: {
            rate: 0.06133,
            label: "Super Off-Peak",
            hours: {
              weekday: [{ start: 0, end: 6 }],
              weekend: [{ start: 0, end: 14 }],
            },
          },
        },
      },
    },
  },
  // ... remaining 11 plans follow same structure
  // TOU-DR, TOU-DR-CARE, DR, DR-LI, DR-LI-CARE, DR-MB, TOU-DR-SES, TOU-ELEC, EV-TOU, EV-TOU-2, EV-TOU-5
];
```

**Important:** The implementing agent should encode ALL 13 plans from the design doc's rate data. The rates for each are documented in the design research. For tiered plans (DR, DR-LI, etc.), use the same TOU schedule structure but with identical rates across all periods (they're not time-differentiated).

**Step 2: Commit**

```bash
git add src/plugins/sdge/plans.ts
git commit -m "feat: add SDGE rate plan data (13 plans)"
```

---

### Task 8: SCE Rate Plans

**Files:**
- Create: `src/plugins/sce/plans.ts`

**Step 1: Write SCE rate plan data**

```typescript
// src/plugins/sce/plans.ts
import type { RatePlan } from "@/lib/types";

export const scePlans: RatePlan[] = [
  {
    id: "TOU-D-4-9PM",
    name: "TOU-D-4-9PM",
    description: "Default TOU plan with 4-9pm peak window.",
    monthlyCharge: 24.15,
    baselineCredit: 0.10,
    seasons: {
      summer: {
        months: [6, 7, 8, 9],
        periods: {
          peak: {
            rate: 0.58,
            label: "Weekday Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [],
            },
          },
          midPeak: {
            rate: 0.46,
            label: "Weekend Mid-Peak (4-9pm)",
            hours: {
              weekday: [],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          offPeak: {
            rate: 0.34,
            label: "Off-Peak (all other)",
            hours: {
              weekday: [{ start: 0, end: 16 }, { start: 21, end: 24 }],
              weekend: [{ start: 0, end: 16 }, { start: 21, end: 24 }],
            },
          },
        },
      },
      winter: {
        months: [10, 11, 12, 1, 2, 3, 4, 5],
        periods: {
          midPeak: {
            rate: 0.51,
            label: "Mid-Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          superOffPeak: {
            rate: 0.33,
            label: "Super Off-Peak (8am-4pm)",
            hours: {
              weekday: [{ start: 8, end: 16 }],
              weekend: [{ start: 8, end: 16 }],
            },
          },
          offPeak: {
            rate: 0.37,
            label: "Off-Peak (other)",
            hours: {
              weekday: [{ start: 0, end: 8 }, { start: 21, end: 24 }],
              weekend: [{ start: 0, end: 8 }, { start: 21, end: 24 }],
            },
          },
        },
      },
    },
  },
  {
    id: "TOU-D-5-8PM",
    name: "TOU-D-5-8PM",
    description: "Shorter 3-hour peak window (5-8pm) with higher peak rate.",
    monthlyCharge: 24.15,
    baselineCredit: 0.10,
    seasons: {
      summer: {
        months: [6, 7, 8, 9],
        periods: {
          peak: {
            rate: 0.74,
            label: "Weekday Peak (5-8pm)",
            hours: {
              weekday: [{ start: 17, end: 20 }],
              weekend: [],
            },
          },
          midPeak: {
            rate: 0.54,
            label: "Weekend Mid-Peak (5-8pm)",
            hours: {
              weekday: [],
              weekend: [{ start: 17, end: 20 }],
            },
          },
          offPeak: {
            rate: 0.34,
            label: "Off-Peak (all other)",
            hours: {
              weekday: [{ start: 0, end: 17 }, { start: 20, end: 24 }],
              weekend: [{ start: 0, end: 17 }, { start: 20, end: 24 }],
            },
          },
        },
      },
      winter: {
        months: [10, 11, 12, 1, 2, 3, 4, 5],
        periods: {
          midPeak: {
            rate: 0.60,
            label: "Mid-Peak (5-8pm)",
            hours: {
              weekday: [{ start: 17, end: 20 }],
              weekend: [{ start: 17, end: 20 }],
            },
          },
          superOffPeak: {
            rate: 0.32,
            label: "Super Off-Peak (8am-5pm)",
            hours: {
              weekday: [{ start: 8, end: 17 }],
              weekend: [{ start: 8, end: 17 }],
            },
          },
          offPeak: {
            rate: 0.38,
            label: "Off-Peak (other)",
            hours: {
              weekday: [{ start: 0, end: 8 }, { start: 20, end: 24 }],
              weekend: [{ start: 0, end: 8 }, { start: 20, end: 24 }],
            },
          },
        },
      },
    },
  },
  {
    id: "TOU-D-PRIME",
    name: "TOU-D-PRIME",
    description: "Best for EV, battery storage, or heat pump owners. Lowest off-peak rates.",
    eligibility: "Requires EV, battery storage, or heat pump",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: [6, 7, 8, 9],
        periods: {
          peak: {
            rate: 0.59,
            label: "Weekday Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [],
            },
          },
          midPeak: {
            rate: 0.40,
            label: "Weekend Mid-Peak (4-9pm)",
            hours: {
              weekday: [],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          offPeak: {
            rate: 0.26,
            label: "Off-Peak (all other)",
            hours: {
              weekday: [{ start: 0, end: 16 }, { start: 21, end: 24 }],
              weekend: [{ start: 0, end: 16 }, { start: 21, end: 24 }],
            },
          },
        },
      },
      winter: {
        months: [10, 11, 12, 1, 2, 3, 4, 5],
        periods: {
          midPeak: {
            rate: 0.56,
            label: "Mid-Peak (4-9pm)",
            hours: {
              weekday: [{ start: 16, end: 21 }],
              weekend: [{ start: 16, end: 21 }],
            },
          },
          superOffPeak: {
            rate: 0.24,
            label: "Super Off-Peak (8am-4pm)",
            hours: {
              weekday: [{ start: 8, end: 16 }],
              weekend: [{ start: 8, end: 16 }],
            },
          },
          offPeak: {
            rate: 0.24,
            label: "Off-Peak (other)",
            hours: {
              weekday: [{ start: 0, end: 8 }, { start: 21, end: 24 }],
              weekend: [{ start: 0, end: 8 }, { start: 21, end: 24 }],
            },
          },
        },
      },
    },
  },
];
```

**Step 2: Commit**

```bash
git add src/plugins/sce/plans.ts
git commit -m "feat: add SCE rate plan data (3 active TOU plans)"
```

---

### Task 9: Plugin Index Files & Registry

**Files:**
- Create: `src/plugins/sdge/index.ts`
- Create: `src/plugins/sce/index.ts`
- Create: `src/lib/registry.ts`

**Step 1: Write SDGE plugin index**

```typescript
// src/plugins/sdge/index.ts
import type { UtilityPlugin } from "@/lib/types";
import { detectCsv, parseCsv } from "./parser";
import { classifyInterval, getSeason } from "./tou";
import { sdgePlans } from "./plans";

export const sdgePlugin: UtilityPlugin = {
  id: "sdge",
  name: "San Diego Gas & Electric",
  shortName: "SDG&E",
  detectCsv,
  parseCsv,
  plans: sdgePlans,
  defaultPlanId: "TOU-DR1",
  classifyInterval,
  getSeason,
  summerMonths: [6, 7, 8, 9, 10],
  downloadInstructions: [
    "Log in to your SDG&E My Account at sdge.com",
    "Navigate to Usage & Bills → Green Button Download",
    "Select your electric meter",
    "Choose your date range",
    "Click Export and download the CSV file",
  ],
  downloadUrl: "https://myaccount.sdge.com",
};
```

**Step 2: Write SCE plugin index**

```typescript
// src/plugins/sce/index.ts
import type { UtilityPlugin } from "@/lib/types";
import { detectCsv, parseCsv } from "./parser";
import { classifyInterval, getSeason } from "./tou";
import { scePlans } from "./plans";

export const scePlugin: UtilityPlugin = {
  id: "sce",
  name: "Southern California Edison",
  shortName: "SCE",
  detectCsv,
  parseCsv,
  plans: scePlans,
  defaultPlanId: "TOU-D-4-9PM",
  classifyInterval,
  getSeason,
  summerMonths: [6, 7, 8, 9],
  downloadInstructions: [
    "Log in to your SCE account at sce.com",
    "Go to My Account → My Usage → Green Button Download",
    "Select 'Energy Usage' data type",
    "Choose your date range (up to 13 months)",
    "Download the CSV file",
  ],
  downloadUrl: "https://www.sce.com/mysce/myaccount",
};
```

**Step 3: Write plugin registry**

```typescript
// src/lib/registry.ts
import type { UtilityPlugin } from "./types";
import { sdgePlugin } from "@/plugins/sdge";
import { scePlugin } from "@/plugins/sce";

const plugins: UtilityPlugin[] = [sdgePlugin, scePlugin];

export function getPlugins(): UtilityPlugin[] {
  return plugins;
}

export function getPlugin(id: string): UtilityPlugin | undefined {
  return plugins.find((p) => p.id === id);
}

export function detectUtility(csvText: string): UtilityPlugin | undefined {
  return plugins.find((p) => p.detectCsv(csvText));
}
```

**Step 4: Commit**

```bash
git add src/plugins/sdge/index.ts src/plugins/sce/index.ts src/lib/registry.ts
git commit -m "feat: add utility plugin index files and registry"
```

---

### Task 10: Cost Calculator

**Files:**
- Create: `src/lib/calculator.ts`
- Create: `src/lib/__tests__/calculator.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/__tests__/calculator.test.ts
import { calculateCosts, calculatePlanComparison } from "../calculator";
import type { IntervalRecord, RatePlan, UtilityPlugin } from "../types";

// Minimal mock plugin
const mockPlugin = {
  classifyInterval: (date: Date, hour: number) => {
    if (hour >= 16 && hour < 21) return "peak";
    if (hour < 6) return "superOffPeak";
    return "offPeak";
  },
  getSeason: (month: number) => (month >= 6 && month <= 9 ? "summer" : "winter"),
} as unknown as UtilityPlugin;

const mockPlan: RatePlan = {
  id: "test",
  name: "Test Plan",
  description: "Test",
  monthlyCharge: 24.15,
  seasons: {
    summer: {
      months: [6, 7, 8, 9],
      periods: {
        peak: { rate: 0.50, label: "Peak", hours: { weekday: [], weekend: [] } },
        offPeak: { rate: 0.30, label: "Off-Peak", hours: { weekday: [], weekend: [] } },
        superOffPeak: { rate: 0.20, label: "Super Off-Peak", hours: { weekday: [], weekend: [] } },
      },
    },
    winter: {
      months: [10, 11, 12, 1, 2, 3, 4, 5],
      periods: {
        peak: { rate: 0.40, label: "Peak", hours: { weekday: [], weekend: [] } },
        offPeak: { rate: 0.25, label: "Off-Peak", hours: { weekday: [], weekend: [] } },
        superOffPeak: { rate: 0.15, label: "Super Off-Peak", hours: { weekday: [], weekend: [] } },
      },
    },
  },
};

describe("calculateCosts", () => {
  it("calculates cost for a single peak interval", () => {
    const records: IntervalRecord[] = [
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 17, 0), // 5pm summer
        endTime: new Date(2025, 6, 15, 17, 15),
        consumption: 1.0,
        generation: 0,
        net: 1.0,
      },
    ];
    const result = calculateCosts(records, mockPlan, mockPlugin);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.dailyData).toHaveLength(1);
    expect(result.dailyData[0].peakCost).toBeCloseTo(0.50);
  });

  it("includes monthly charge prorated by days", () => {
    const records: IntervalRecord[] = [
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 17, 0),
        endTime: new Date(2025, 6, 15, 17, 15),
        consumption: 0,
        generation: 0,
        net: 0,
      },
    ];
    const result = calculateCosts(records, mockPlan, mockPlugin);
    // 1 day of data → monthlyCharge * (1/30)
    expect(result.totalCost).toBeCloseTo(24.15 / 30, 1);
  });
});

describe("calculatePlanComparison", () => {
  it("calculates monthly cost for given usage and peak percentage", () => {
    const cost = calculatePlanComparison(mockPlan, 500, 25, "summer");
    // 500 * 0.25 = 125 kWh peak @ $0.50 = $62.50
    // 375 remaining: 225 off-peak @ $0.30 = $67.50, 150 super off-peak @ $0.20 = $30
    // Total: 62.50 + 67.50 + 30 + 24.15 = $184.15
    expect(cost).toBeCloseTo(184.15, 0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/calculator.test.ts`
Expected: FAIL

**Step 3: Implement calculator**

```typescript
// src/lib/calculator.ts
import type {
  IntervalRecord,
  RatePlan,
  UtilityPlugin,
  AnalysisResult,
  DailyData,
} from "./types";

export function calculateCosts(
  records: IntervalRecord[],
  plan: RatePlan,
  plugin: UtilityPlugin
): AnalysisResult {
  const dailyMap = new Map<string, DailyData>();
  const hourlyWeekday = new Array(24).fill(0);
  const hourlyWeekend = new Array(24).fill(0);
  const hourlyWeekdayCount = new Array(24).fill(0);
  const hourlyWeekendCount = new Array(24).fill(0);

  for (const record of records) {
    const dateKey = record.date.toISOString().split("T")[0];
    const hour = record.startTime.getHours();
    const month = record.startTime.getMonth() + 1;
    const season = plugin.getSeason(month);
    const period = plugin.classifyInterval(record.startTime, hour);
    const isWeekend =
      record.startTime.getDay() === 0 || record.startTime.getDay() === 6;

    // Look up rate for this period
    const seasonRates = plan.seasons[season];
    const periodRate = seasonRates.periods[period];
    const rate = periodRate ? periodRate.rate + (periodRate.fees || 0) : 0;

    // Apply baseline credit if applicable
    let effectiveRate = rate;
    if (plan.baselineCredit) {
      effectiveRate = Math.max(0, rate - plan.baselineCredit);
    }

    const cost = record.consumption * effectiveRate;

    // Initialize daily entry
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        peakCost: 0,
        offPeakCost: 0,
        superOffPeakCost: 0,
        midPeakCost: 0,
        totalCost: 0,
        peakUsage: 0,
        offPeakUsage: 0,
        superOffPeakUsage: 0,
        midPeakUsage: 0,
        totalUsage: 0,
        peakGeneration: 0,
        offPeakGeneration: 0,
        superOffPeakGeneration: 0,
        totalGeneration: 0,
      });
    }

    const day = dailyMap.get(dateKey)!;

    // Accumulate by period
    if (period === "peak") {
      day.peakCost += cost;
      day.peakUsage += record.consumption;
      day.peakGeneration += record.generation;
    } else if (period === "midPeak") {
      day.midPeakCost = (day.midPeakCost || 0) + cost;
      day.midPeakUsage = (day.midPeakUsage || 0) + record.consumption;
    } else if (period === "superOffPeak") {
      day.superOffPeakCost += cost;
      day.superOffPeakUsage += record.consumption;
      day.superOffPeakGeneration += record.generation;
    } else {
      day.offPeakCost += cost;
      day.offPeakUsage += record.consumption;
      day.offPeakGeneration += record.generation;
    }

    day.totalCost += cost;
    day.totalUsage += record.consumption;
    day.totalGeneration += record.generation;

    // Hourly profile
    if (isWeekend) {
      hourlyWeekend[hour] += record.consumption;
      hourlyWeekendCount[hour]++;
    } else {
      hourlyWeekday[hour] += record.consumption;
      hourlyWeekdayCount[hour]++;
    }
  }

  const dailyData = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const daysAnalyzed = dailyData.length;

  // Add prorated monthly charge
  const dailyCharge = plan.monthlyCharge / 30;
  const totalFixedCharge = dailyCharge * daysAnalyzed;

  const totalUsageCost = dailyData.reduce((sum, d) => sum + d.totalCost, 0);
  const totalCost = totalUsageCost + totalFixedCharge;
  const totalUsage = dailyData.reduce((sum, d) => sum + d.totalUsage, 0);
  const totalGeneration = dailyData.reduce(
    (sum, d) => sum + d.totalGeneration,
    0
  );

  // Average hourly profiles
  const weekdayProfile = hourlyWeekday.map((total, i) =>
    hourlyWeekdayCount[i] > 0 ? total / hourlyWeekdayCount[i] : 0
  );
  const weekendProfile = hourlyWeekend.map((total, i) =>
    hourlyWeekendCount[i] > 0 ? total / hourlyWeekendCount[i] : 0
  );

  const dates = dailyData.map((d) => d.date);

  return {
    dailyData,
    totalCost,
    totalUsage,
    totalGeneration,
    avgDailyCost: daysAnalyzed > 0 ? totalCost / daysAnalyzed : 0,
    avgDailyUsage: daysAnalyzed > 0 ? totalUsage / daysAnalyzed : 0,
    hourlyProfile: { weekday: weekdayProfile, weekend: weekendProfile },
    dateRange: {
      start: dates[0] || "",
      end: dates[dates.length - 1] || "",
    },
    daysAnalyzed,
  };
}

export function calculatePlanComparison(
  plan: RatePlan,
  monthlyKwh: number,
  peakPercent: number,
  season: "summer" | "winter"
): number {
  const seasonRates = plan.seasons[season];
  const periods = Object.entries(seasonRates.periods);

  const peakKwh = monthlyKwh * (peakPercent / 100);
  const remainingKwh = monthlyKwh - peakKwh;

  // Find peak-like and non-peak periods
  const peakPeriod = periods.find(
    ([key]) => key === "peak" || key === "midPeak"
  );
  const offPeakPeriod = periods.find(([key]) => key === "offPeak");
  const superOffPeakPeriod = periods.find(([key]) => key === "superOffPeak");

  let cost = 0;

  // Peak usage
  if (peakPeriod) {
    const rate = peakPeriod[1].rate + (peakPeriod[1].fees || 0);
    const effectiveRate = plan.baselineCredit
      ? Math.max(0, rate - plan.baselineCredit)
      : rate;
    cost += peakKwh * effectiveRate;
  }

  // Off-peak: 60% of remaining
  if (offPeakPeriod) {
    const offPeakKwh = remainingKwh * 0.6;
    const rate = offPeakPeriod[1].rate + (offPeakPeriod[1].fees || 0);
    const effectiveRate = plan.baselineCredit
      ? Math.max(0, rate - plan.baselineCredit)
      : rate;
    cost += offPeakKwh * effectiveRate;
  }

  // Super off-peak: 40% of remaining
  if (superOffPeakPeriod) {
    const superOffPeakKwh = remainingKwh * 0.4;
    const rate = superOffPeakPeriod[1].rate + (superOffPeakPeriod[1].fees || 0);
    const effectiveRate = plan.baselineCredit
      ? Math.max(0, rate - plan.baselineCredit)
      : rate;
    cost += superOffPeakKwh * effectiveRate;
  } else if (offPeakPeriod) {
    // If no super off-peak, put all remaining in off-peak
    const extraKwh = remainingKwh * 0.4;
    const rate = offPeakPeriod[1].rate + (offPeakPeriod[1].fees || 0);
    const effectiveRate = plan.baselineCredit
      ? Math.max(0, rate - plan.baselineCredit)
      : rate;
    cost += extraKwh * effectiveRate;
  }

  cost += plan.monthlyCharge;

  return cost;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/calculator.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/calculator.ts src/lib/__tests__/calculator.test.ts
git commit -m "feat: add cost calculator with plan comparison"
```

---

### Task 11: Utility Helpers

**Files:**
- Create: `src/lib/utils.ts`

**Step 1: Write utility functions**

```typescript
// src/lib/utils.ts

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRate(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatKwh(value: number): string {
  return `${value.toFixed(1)} kWh`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function periodColor(period: string): string {
  switch (period) {
    case "peak":
      return "#ef4444"; // red-500
    case "midPeak":
      return "#f97316"; // orange-500
    case "offPeak":
      return "#3b82f6"; // blue-500
    case "superOffPeak":
      return "#22c55e"; // green-500
    default:
      return "#6b7280"; // gray-500
  }
}

export function periodLabel(period: string): string {
  switch (period) {
    case "peak":
      return "Peak";
    case "midPeak":
      return "Mid-Peak";
    case "offPeak":
      return "Off-Peak";
    case "superOffPeak":
      return "Super Off-Peak";
    default:
      return period;
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add formatting and display utility functions"
```

---

### Task 12: CSV Uploader Component

**Files:**
- Create: `src/components/CsvUploader.tsx`

**Step 1: Write the component**

This is a client component that handles file upload and textarea paste. It calls `detectUtility()` from the registry to identify which utility the CSV belongs to.

```typescript
// src/components/CsvUploader.tsx
"use client";

import { useCallback, useState } from "react";
import { detectUtility } from "@/lib/registry";
import type { IntervalRecord, UtilityPlugin } from "@/lib/types";

interface CsvUploaderProps {
  onDataLoaded: (
    records: IntervalRecord[],
    plugin: UtilityPlugin
  ) => void;
}

export default function CsvUploader({ onDataLoaded }: CsvUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const processText = useCallback(
    (text: string) => {
      setError(null);
      const plugin = detectUtility(text);
      if (!plugin) {
        setError(
          "Could not detect utility format. Please upload an SDG&E or SCE CSV file."
        );
        return;
      }
      try {
        const records = plugin.parseCsv(text);
        if (records.length === 0) {
          setError("No usage data found in the file.");
          return;
        }
        onDataLoaded(records, plugin);
      } catch (e) {
        setError(`Error parsing CSV: ${(e as Error).message}`);
      }
    },
    [onDataLoaded]
  );

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processText(text);
      };
      reader.readAsText(file);
    },
    [processText]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <p className="text-gray-600 mb-2">
          Drag & drop your CSV file here, or
        </p>
        <label className="inline-block cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Browse Files
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        <p className="text-sm text-gray-400 mt-2">
          Supports SDG&E and SCE CSV formats
        </p>
      </div>

      {/* Paste area */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
          Or paste CSV data directly
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your CSV data here..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-y"
          />
          <button
            onClick={() => processText(pasteText)}
            disabled={!pasteText.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Analyze Data
          </button>
        </div>
      </details>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/CsvUploader.tsx
git commit -m "feat: add CSV uploader component with drag-and-drop"
```

---

### Task 13: Chart Components

**Files:**
- Create: `src/components/charts/DailyUsageChart.tsx`
- Create: `src/components/charts/DailyCostChart.tsx`
- Create: `src/components/charts/HourlyDistributionChart.tsx`

**Step 1: Write DailyUsageChart**

```typescript
// src/components/charts/DailyUsageChart.tsx
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, Brush,
} from "recharts";
import type { DailyData } from "@/lib/types";
import { formatDate, formatKwh, periodColor } from "@/lib/utils";

interface Props {
  data: DailyData[];
  hasMidPeak?: boolean;
}

export default function DailyUsageChart({ data, hasMidPeak }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Daily Usage Breakdown</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(0)}`}
            label={{
              value: "kWh",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => [
              formatKwh(value),
              name,
            ]}
          />
          <Legend />
          <Bar
            dataKey="peakUsage"
            name="Peak"
            stackId="usage"
            fill={periodColor("peak")}
          />
          {hasMidPeak && (
            <Bar
              dataKey="midPeakUsage"
              name="Mid-Peak"
              stackId="usage"
              fill={periodColor("midPeak")}
            />
          )}
          <Bar
            dataKey="offPeakUsage"
            name="Off-Peak"
            stackId="usage"
            fill={periodColor("offPeak")}
          />
          <Bar
            dataKey="superOffPeakUsage"
            name="Super Off-Peak"
            stackId="usage"
            fill={periodColor("superOffPeak")}
          />
          {data.length > 30 && (
            <Brush
              dataKey="date"
              height={30}
              stroke="#8884d8"
              tickFormatter={formatDate}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Write DailyCostChart**

```typescript
// src/components/charts/DailyCostChart.tsx
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, Brush,
} from "recharts";
import type { DailyData } from "@/lib/types";
import { formatDate, formatCurrency, periodColor } from "@/lib/utils";

interface Props {
  data: DailyData[];
  hasMidPeak?: boolean;
}

export default function DailyCostChart({ data, hasMidPeak }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Daily Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            label={{
              value: "Cost ($)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name,
            ]}
          />
          <Legend />
          <Bar
            dataKey="peakCost"
            name="Peak"
            stackId="cost"
            fill={periodColor("peak")}
          />
          {hasMidPeak && (
            <Bar
              dataKey="midPeakCost"
              name="Mid-Peak"
              stackId="cost"
              fill={periodColor("midPeak")}
            />
          )}
          <Bar
            dataKey="offPeakCost"
            name="Off-Peak"
            stackId="cost"
            fill={periodColor("offPeak")}
          />
          <Bar
            dataKey="superOffPeakCost"
            name="Super Off-Peak"
            stackId="cost"
            fill={periodColor("superOffPeak")}
          />
          {data.length > 30 && (
            <Brush
              dataKey="date"
              height={30}
              stroke="#8884d8"
              tickFormatter={formatDate}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 3: Write HourlyDistributionChart**

```typescript
// src/components/charts/HourlyDistributionChart.tsx
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { formatKwh } from "@/lib/utils";

interface Props {
  weekdayProfile: number[];
  weekendProfile: number[];
}

export default function HourlyDistributionChart({
  weekdayProfile,
  weekendProfile,
}: Props) {
  const data = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i === 0 ? 12 : i > 12 ? i - 12 : i}${i < 12 ? "am" : "pm"}`,
    weekday: weekdayProfile[i],
    weekend: weekendProfile[i],
  }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">
        Average Hourly Usage Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(2)}`}
            label={{
              value: "Avg kWh",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatKwh(value),
              name === "weekday" ? "Weekday Avg" : "Weekend Avg",
            ]}
          />
          <Legend />
          <Bar dataKey="weekday" name="Weekday" fill="#3b82f6" />
          <Bar dataKey="weekend" name="Weekend" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/charts/
git commit -m "feat: add daily usage, daily cost, and hourly distribution chart components"
```

---

### Task 14: Usage Dashboard Component

**Files:**
- Create: `src/components/UsageDashboard.tsx`

**Step 1: Write the dashboard**

This component renders the summary stats and all three charts after CSV analysis.

```typescript
// src/components/UsageDashboard.tsx
"use client";

import type { AnalysisResult, UtilityPlugin } from "@/lib/types";
import { formatCurrency, formatKwh } from "@/lib/utils";
import DailyUsageChart from "./charts/DailyUsageChart";
import DailyCostChart from "./charts/DailyCostChart";
import HourlyDistributionChart from "./charts/HourlyDistributionChart";

interface Props {
  result: AnalysisResult;
  plugin: UtilityPlugin;
  planName: string;
}

export default function UsageDashboard({ result, plugin, planName }: Props) {
  const hasMidPeak = result.dailyData.some((d) => (d.midPeakUsage || 0) > 0);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Cost"
          value={formatCurrency(result.totalCost)}
        />
        <StatCard
          label="Total Usage"
          value={formatKwh(result.totalUsage)}
        />
        <StatCard
          label="Avg Daily Cost"
          value={formatCurrency(result.avgDailyCost)}
        />
        <StatCard
          label="Days Analyzed"
          value={result.daysAnalyzed.toString()}
        />
      </div>

      {/* Utility and plan info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
        <span className="font-medium">{plugin.shortName}</span> &middot;{" "}
        {planName} &middot; {result.dateRange.start} to {result.dateRange.end}
        {result.totalGeneration > 0 && (
          <span>
            {" "}
            &middot; Solar generation: {formatKwh(result.totalGeneration)}
          </span>
        )}
      </div>

      {/* Charts */}
      <DailyUsageChart data={result.dailyData} hasMidPeak={hasMidPeak} />
      <DailyCostChart data={result.dailyData} hasMidPeak={hasMidPeak} />
      <HourlyDistributionChart
        weekdayProfile={result.hourlyProfile.weekday}
        weekendProfile={result.hourlyProfile.weekend}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/UsageDashboard.tsx
git commit -m "feat: add usage dashboard component with summary stats and charts"
```

---

### Task 15: Plan Comparison Component

**Files:**
- Create: `src/components/PlanComparison.tsx`
- Create: `src/components/PlanCard.tsx`

**Step 1: Write PlanCard**

```typescript
// src/components/PlanCard.tsx
"use client";

import type { RatePlan } from "@/lib/types";
import { formatCurrency, periodLabel } from "@/lib/utils";

interface Props {
  plan: RatePlan;
  season: "summer" | "winter";
  monthlyCost: number;
}

export default function PlanCard({ plan, season, monthlyCost }: Props) {
  const seasonRates = plan.seasons[season];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border flex-1">
      <h3 className="text-xl font-bold">{plan.name}</h3>
      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
      {plan.eligibility && (
        <p className="text-xs text-amber-600 mt-1">{plan.eligibility}</p>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-gray-700 uppercase">
          {season} Rates
        </p>
        {Object.entries(seasonRates.periods).map(([key, period]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-gray-600">{period.label}</span>
            <span className="font-medium">
              ${period.rate.toFixed(2)}/kWh
              {plan.baselineCredit && (
                <span className="text-green-600 text-xs ml-1">
                  (-${plan.baselineCredit.toFixed(2)} credit)
                </span>
              )}
            </span>
          </div>
        ))}
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-gray-600">Monthly Charge</span>
          <span className="font-medium">
            {formatCurrency(plan.monthlyCharge)}
          </span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t">
        <p className="text-sm text-gray-500">Estimated Monthly Cost</p>
        <p className="text-3xl font-bold text-blue-600">
          {formatCurrency(monthlyCost)}
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Write PlanComparison**

```typescript
// src/components/PlanComparison.tsx
"use client";

import { useState, useMemo } from "react";
import type { RatePlan, UtilityPlugin, Season } from "@/lib/types";
import { calculatePlanComparison } from "@/lib/calculator";
import { formatCurrency } from "@/lib/utils";
import PlanCard from "./PlanCard";

interface Props {
  plugin: UtilityPlugin;
}

export default function PlanComparison({ plugin }: Props) {
  const [monthlyKwh, setMonthlyKwh] = useState(500);
  const [peakPercent, setPeakPercent] = useState(25);
  const [season, setSeason] = useState<Season>("summer");
  const [leftPlanId, setLeftPlanId] = useState(plugin.plans[0]?.id || "");
  const [rightPlanId, setRightPlanId] = useState(
    plugin.plans[1]?.id || plugin.plans[0]?.id || ""
  );

  const leftPlan = plugin.plans.find((p) => p.id === leftPlanId);
  const rightPlan = plugin.plans.find((p) => p.id === rightPlanId);

  const leftCost = useMemo(
    () =>
      leftPlan
        ? calculatePlanComparison(leftPlan, monthlyKwh, peakPercent, season)
        : 0,
    [leftPlan, monthlyKwh, peakPercent, season]
  );

  const rightCost = useMemo(
    () =>
      rightPlan
        ? calculatePlanComparison(rightPlan, monthlyKwh, peakPercent, season)
        : 0,
    [rightPlan, monthlyKwh, peakPercent, season]
  );

  const savings = Math.abs(leftCost - rightCost);
  const cheaperSide = leftCost < rightCost ? "left" : "right";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Usage (kWh)
            </label>
            <input
              type="number"
              value={monthlyKwh}
              onChange={(e) => setMonthlyKwh(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peak Usage: {peakPercent}%
            </label>
            <input
              type="range"
              value={peakPercent}
              onChange={(e) => setPeakPercent(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Season
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value as Season)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="summer">Summer</option>
              <option value="winter">Winter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Savings badge */}
      {savings > 5 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <span className="text-green-700 font-medium">
            {cheaperSide === "left" ? leftPlan?.name : rightPlan?.name} saves
            you {formatCurrency(savings)}/month
          </span>
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <select
            value={leftPlanId}
            onChange={(e) => setLeftPlanId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-3"
          >
            {plugin.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {leftPlan && (
            <PlanCard
              plan={leftPlan}
              season={season}
              monthlyCost={leftCost}
            />
          )}
        </div>
        <div>
          <select
            value={rightPlanId}
            onChange={(e) => setRightPlanId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-3"
          >
            {plugin.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {rightPlan && (
            <PlanCard
              plan={rightPlan}
              season={season}
              monthlyCost={rightCost}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/PlanCard.tsx src/components/PlanComparison.tsx
git commit -m "feat: add plan comparison and plan card components"
```

---

### Task 16: Header and Footer Components

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/Footer.tsx`
- Create: `src/components/UtilitySelector.tsx`

**Step 1: Write UtilitySelector**

```typescript
// src/components/UtilitySelector.tsx
"use client";

import { getPlugins } from "@/lib/registry";

interface Props {
  selectedId: string;
  onChange: (id: string) => void;
}

export default function UtilitySelector({ selectedId, onChange }: Props) {
  const plugins = getPlugins();

  return (
    <select
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
    >
      {plugins.map((p) => (
        <option key={p.id} value={p.id}>
          {p.shortName}
        </option>
      ))}
    </select>
  );
}
```

**Step 2: Write Header**

```typescript
// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Energy Analyzer
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/compare"
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Compare Plans
          </Link>
          <Link
            href="/analyze"
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Analyze Usage
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t px-4 py-3 space-y-2">
          <Link
            href="/compare"
            className="block text-gray-600 hover:text-gray-900"
            onClick={() => setMenuOpen(false)}
          >
            Compare Plans
          </Link>
          <Link
            href="/analyze"
            className="block text-gray-600 hover:text-gray-900"
            onClick={() => setMenuOpen(false)}
          >
            Analyze Usage
          </Link>
        </nav>
      )}
    </header>
  );
}
```

**Step 3: Write Footer**

```typescript
// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
        <p>
          Energy Analyzer — Compare utility rate plans and analyze your energy
          usage.
        </p>
        <p className="mt-1">
          Supports SDG&E and SCE. Not affiliated with any utility company.
        </p>
      </div>
    </footer>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/Header.tsx src/components/Footer.tsx src/components/UtilitySelector.tsx
git commit -m "feat: add header, footer, and utility selector components"
```

---

### Task 17: Root Layout and Landing Page

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update globals.css**

Keep Tailwind directives, remove the default Next.js template styles. Keep it minimal:

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}
```

**Step 2: Update root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Energy Analyzer",
  description:
    "Compare utility rate plans and analyze your energy usage. Supports SDG&E and SCE.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

**Step 3: Write landing page**

```typescript
// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Take Control of Your Energy Costs
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
          Compare rate plans and analyze your actual usage data. Supports
          SDG&E and Southern California Edison.
        </p>
      </section>

      {/* CTA Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link
          href="/compare"
          className="group bg-white rounded-xl p-8 shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-4">&#9889;</div>
          <h2 className="text-2xl font-bold group-hover:text-blue-600 transition-colors">
            Compare Rate Plans
          </h2>
          <p className="mt-2 text-gray-600">
            See which rate plan saves you the most based on your estimated
            usage pattern. Compare side-by-side.
          </p>
        </Link>

        <Link
          href="/analyze"
          className="group bg-white rounded-xl p-8 shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-4">&#128200;</div>
          <h2 className="text-2xl font-bold group-hover:text-blue-600 transition-colors">
            Analyze Your Usage
          </h2>
          <p className="mt-2 text-gray-600">
            Upload your utility CSV and see exactly how your energy costs
            break down by time of use.
          </p>
        </Link>
      </section>

      {/* Supported utilities */}
      <section className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">
          Supported Utilities
        </p>
        <div className="flex justify-center gap-8">
          <span className="text-lg font-semibold text-gray-700">SDG&E</span>
          <span className="text-lg font-semibold text-gray-700">SCE</span>
        </div>
      </section>
    </div>
  );
}
```

**Step 4: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: add root layout and landing page"
```

---

### Task 18: Compare Plans Page

**Files:**
- Create: `src/app/compare/page.tsx`

**Step 1: Write the compare page**

```typescript
// src/app/compare/page.tsx
"use client";

import { useState } from "react";
import { getPlugins, getPlugin } from "@/lib/registry";
import UtilitySelector from "@/components/UtilitySelector";
import PlanComparison from "@/components/PlanComparison";

export default function ComparePage() {
  const plugins = getPlugins();
  const [utilityId, setUtilityId] = useState(plugins[0]?.id || "sdge");
  const plugin = getPlugin(utilityId);

  if (!plugin) return <p>No utility plugins available.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compare Rate Plans</h1>
          <p className="text-gray-600 mt-1">
            Compare {plugin.shortName} rate plans side by side
          </p>
        </div>
        <UtilitySelector selectedId={utilityId} onChange={setUtilityId} />
      </div>

      <PlanComparison key={utilityId} plugin={plugin} />
    </div>
  );
}
```

**Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/compare/page.tsx
git commit -m "feat: add compare plans page"
```

---

### Task 19: Analyze Usage Page

**Files:**
- Create: `src/app/analyze/page.tsx`

**Step 1: Write the analyze page**

```typescript
// src/app/analyze/page.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import type { IntervalRecord, UtilityPlugin } from "@/lib/types";
import { getPlugins } from "@/lib/registry";
import CsvUploader from "@/components/CsvUploader";
import UsageDashboard from "@/components/UsageDashboard";
import { calculateCosts } from "@/lib/calculator";

export default function AnalyzePage() {
  const plugins = getPlugins();
  const [records, setRecords] = useState<IntervalRecord[] | null>(null);
  const [plugin, setPlugin] = useState<UtilityPlugin | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const handleDataLoaded = useCallback(
    (newRecords: IntervalRecord[], detectedPlugin: UtilityPlugin) => {
      setRecords(newRecords);
      setPlugin(detectedPlugin);
      setSelectedPlanId(detectedPlugin.defaultPlanId);
    },
    []
  );

  const selectedPlan = plugin?.plans.find((p) => p.id === selectedPlanId);

  const result = useMemo(() => {
    if (!records || !selectedPlan || !plugin) return null;
    return calculateCosts(records, selectedPlan, plugin);
  }, [records, selectedPlan, plugin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analyze Your Energy Usage</h1>
        <p className="text-gray-600 mt-1">
          Upload your utility CSV file to see detailed usage and cost breakdowns
        </p>
      </div>

      {/* Download instructions */}
      <details className="bg-white rounded-xl p-6 shadow-sm border">
        <summary className="cursor-pointer font-medium text-gray-700">
          How to download your usage data
        </summary>
        <div className="mt-4 space-y-6">
          {plugins.map((p) => (
            <div key={p.id}>
              <h3 className="font-semibold text-gray-800">
                {p.name}
              </h3>
              <ol className="mt-2 list-decimal list-inside text-sm text-gray-600 space-y-1">
                {p.downloadInstructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <a
                href={p.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-blue-600 hover:underline"
              >
                Go to {p.shortName} My Account &rarr;
              </a>
            </div>
          ))}
        </div>
      </details>

      {/* CSV upload */}
      <CsvUploader onDataLoaded={handleDataLoaded} />

      {/* Plan selector (shown after data loads) */}
      {plugin && (
        <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Rate Plan:
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            {plugin.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            Auto-detected: {plugin.shortName}
          </span>
        </div>
      )}

      {/* Results */}
      {result && plugin && selectedPlan && (
        <UsageDashboard
          result={result}
          plugin={plugin}
          planName={selectedPlan.name}
        />
      )}
    </div>
  );
}
```

**Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/analyze/page.tsx
git commit -m "feat: add analyze usage page"
```

---

### Task 20: Integration Testing with Real CSV Files

**Files:**
- Create: `src/plugins/sdge/__tests__/integration.test.ts`
- Create: `src/plugins/sce/__tests__/integration.test.ts`

**Step 1: Write SDGE integration test**

Read first 20 data rows from the real SDGE CSV and verify parsing.

```typescript
// src/plugins/sdge/__tests__/integration.test.ts
import * as fs from "fs";
import * as path from "path";
import { detectCsv, parseCsv } from "../parser";

const CSV_PATH = path.resolve(
  __dirname,
  "../../../../sdge_download.csv"
);

describe("SDGE parser integration with real CSV", () => {
  let csvText: string;

  beforeAll(() => {
    csvText = fs.readFileSync(CSV_PATH, "utf-8");
  });

  it("detects the file as SDGE format", () => {
    expect(detectCsv(csvText)).toBe(true);
  });

  it("parses all records without errors", () => {
    const records = parseCsv(csvText);
    expect(records.length).toBeGreaterThan(1000);
  });

  it("first record has expected date", () => {
    const records = parseCsv(csvText);
    expect(records[0].startTime.getFullYear()).toBe(2024);
    expect(records[0].startTime.getMonth()).toBe(4); // May
    expect(records[0].startTime.getDate()).toBe(25);
  });

  it("records have non-negative consumption", () => {
    const records = parseCsv(csvText);
    for (const r of records.slice(0, 100)) {
      expect(r.consumption).toBeGreaterThanOrEqual(0);
    }
  });
});
```

**Step 2: Write SCE integration test**

```typescript
// src/plugins/sce/__tests__/integration.test.ts
import * as fs from "fs";
import * as path from "path";
import { detectCsv, parseCsv } from "../parser";

const SHORT_CSV_PATH = path.resolve(
  __dirname,
  "../../../../SCE_Usage_8002472069_07-28-25_to_08-10-25.csv"
);

const LONG_CSV_PATH = path.resolve(
  __dirname,
  "../../../../SCE_Usage_8002472069_11-14-24_to_12-11-25.csv"
);

describe("SCE parser integration with real CSV", () => {
  describe("short file (13 days)", () => {
    let csvText: string;

    beforeAll(() => {
      csvText = fs.readFileSync(SHORT_CSV_PATH, "utf-8");
    });

    it("detects the file as SCE format", () => {
      expect(detectCsv(csvText)).toBe(true);
    });

    it("parses all records", () => {
      const records = parseCsv(csvText);
      // 13 days * 96 intervals = ~1248 records
      expect(records.length).toBeGreaterThan(1000);
    });

    it("first record has expected date (July 28, 2025)", () => {
      const records = parseCsv(csvText);
      expect(records[0].startTime.getFullYear()).toBe(2025);
      expect(records[0].startTime.getMonth()).toBe(6); // July
      expect(records[0].startTime.getDate()).toBe(28);
    });
  });

  describe("long file (391 days)", () => {
    let csvText: string;

    beforeAll(() => {
      csvText = fs.readFileSync(LONG_CSV_PATH, "utf-8");
    });

    it("parses all records from long file", () => {
      const records = parseCsv(csvText);
      expect(records.length).toBeGreaterThan(30000);
    });

    it("contains solar generation data", () => {
      const records = parseCsv(csvText);
      const withGeneration = records.filter((r) => r.generation > 0);
      expect(withGeneration.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 3: Run all tests**

Run: `npx jest --verbose`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/plugins/sdge/__tests__/integration.test.ts src/plugins/sce/__tests__/integration.test.ts
git commit -m "test: add integration tests with real CSV files"
```

---

### Task 21: Final Build Verification and Dev Server Test

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run dev server**

Run: `npm run dev`
Expected: Server starts at localhost:3000

**Step 3: Manual verification checklist**

- [ ] Landing page loads with two CTA cards
- [ ] `/compare` shows plan comparison with utility selector
- [ ] Switching utility changes available plans
- [ ] Adjusting sliders recalculates costs
- [ ] `/analyze` shows upload area and download instructions
- [ ] Uploading SDGE CSV auto-detects SDG&E and shows charts
- [ ] Uploading SCE CSV auto-detects SCE and shows charts
- [ ] Changing rate plan recalculates costs
- [ ] Charts show stacked bars with correct period colors
- [ ] Hourly distribution chart shows weekday vs weekend profiles

**Step 4: Run production build**

Run: `npm run build`
Expected: Build succeeds, `out/` directory contains static files

**Step 5: Commit any fixes from manual testing**

```bash
git add -A
git commit -m "fix: resolve issues found during manual testing"
```

---

### Task 22: Update .gitignore and Clean Up

**Step 1: Update .gitignore**

Ensure these are in `.gitignore`:
```
node_modules/
.next/
out/
*.csv
```

Note: The CSV files contain personal usage data and should not be committed.

**Step 2: Final commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore, exclude CSV data files"
```
