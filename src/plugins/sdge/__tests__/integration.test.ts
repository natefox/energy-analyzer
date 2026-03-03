import * as fs from "fs";
import * as path from "path";
import { detectCsv, parseCsv } from "../parser";
import { classifyInterval, getSeason } from "../tou";
import { sdgePlans } from "../plans";
import { calculateCosts } from "@/lib/calculator";
import { sdgePlugin } from "../index";

const CSV_PATH = path.resolve(__dirname, "../../../../sdge_download.csv");

describe("SDGE integration with real CSV", () => {
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

  it("first record has expected date (May 25, 2024)", () => {
    const records = parseCsv(csvText);
    expect(records[0].startTime.getFullYear()).toBe(2024);
    expect(records[0].startTime.getMonth()).toBe(4);
    expect(records[0].startTime.getDate()).toBe(25);
  });

  it("records have non-negative consumption", () => {
    const records = parseCsv(csvText);
    for (const r of records.slice(0, 100)) {
      expect(r.consumption).toBeGreaterThanOrEqual(0);
    }
  });

  it("calculates costs with TOU-DR1 plan", () => {
    const records = parseCsv(csvText);
    const plan = sdgePlans.find((p) => p.id === "TOU-DR1")!;
    const result = calculateCosts(records, plan, sdgePlugin);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.daysAnalyzed).toBeGreaterThan(100);
    expect(result.dailyData.length).toBeGreaterThan(100);
  });
});
