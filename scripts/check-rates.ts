#!/usr/bin/env npx ts-node
/**
 * Check rate plan freshness and output a report.
 * Used by the rate-check workflow and can be run locally.
 *
 * Usage: npx ts-node scripts/check-rates.ts
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface RateFileInfo {
  utility: string;
  file: string;
  lastModified: string;
  daysSinceUpdate: number;
  planCount: number;
}

const RATE_FILES = [
  { utility: "SDG&E", file: "src/plugins/sdge/plans.ts" },
  { utility: "SCE", file: "src/plugins/sce/plans.ts" },
];

const STALE_THRESHOLD_DAYS = 90; // 3 months

function getLastModified(filePath: string): Date {
  const fullPath = path.resolve(filePath);
  try {
    const result = execSync(`git log -1 --format=%aI -- "${fullPath}"`, {
      encoding: "utf-8",
    }).trim();
    return result ? new Date(result) : new Date(0);
  } catch {
    return new Date(0);
  }
}

function countPlans(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const matches = content.match(/id:\s*"/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

const now = new Date();
const results: RateFileInfo[] = RATE_FILES.map(({ utility, file }) => {
  const lastMod = getLastModified(file);
  const daysSince = Math.floor(
    (now.getTime() - lastMod.getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    utility,
    file,
    lastModified: lastMod.toISOString().split("T")[0],
    daysSinceUpdate: daysSince,
    planCount: countPlans(file),
  };
});

const stale = results.filter((r) => r.daysSinceUpdate > STALE_THRESHOLD_DAYS);

console.log("Rate Plan Freshness Report");
console.log("=".repeat(50));
for (const r of results) {
  const status =
    r.daysSinceUpdate > STALE_THRESHOLD_DAYS ? "STALE" : "OK";
  console.log(
    `${r.utility}: ${r.planCount} plans, last updated ${r.lastModified} (${r.daysSinceUpdate} days ago) [${status}]`
  );
}

if (stale.length > 0) {
  console.log("\nStale rate files detected!");
  // Output for GitHub Actions
  const staleList = stale.map((r) => r.utility).join(", ");
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `stale=true\nstale_utilities=${staleList}\n`
    );
  }
  process.exit(1);
} else {
  console.log("\nAll rate files are up to date.");
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, "stale=false\n");
  }
}
