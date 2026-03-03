import * as fs from "fs";
import * as path from "path";
import { detectCsv, parseCsv } from "../parser";
import { scePlans } from "../plans";
import { calculateCosts } from "@/lib/calculator";
import { scePlugin } from "../index";

const SHORT_CSV_PATH = path.resolve(
  __dirname,
  "../../../../SCE_Usage_8002472069_07-28-25_to_08-10-25.csv"
);
const LONG_CSV_PATH = path.resolve(
  __dirname,
  "../../../../SCE_Usage_8002472069_11-14-24_to_12-11-25.csv"
);

describe("SCE integration with real CSV", () => {
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
      expect(records.length).toBeGreaterThan(1000);
    });

    it("first record has expected date (July 28, 2025)", () => {
      const records = parseCsv(csvText);
      expect(records[0].startTime.getFullYear()).toBe(2025);
      expect(records[0].startTime.getMonth()).toBe(6);
      expect(records[0].startTime.getDate()).toBe(28);
    });

    it("calculates costs with TOU-D-4-9PM plan", () => {
      const records = parseCsv(csvText);
      const plan = scePlans.find((p) => p.id === "TOU-D-4-9PM")!;
      const result = calculateCosts(records, plan, scePlugin);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.daysAnalyzed).toBe(13);
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

    it("calculates costs with all 3 SCE plans", () => {
      const records = parseCsv(csvText);
      for (const plan of scePlans) {
        const result = calculateCosts(records, plan, scePlugin);
        expect(result.totalCost).toBeGreaterThan(0);
        expect(result.daysAnalyzed).toBeGreaterThan(300);
        expect(result.totalGeneration).toBeGreaterThan(0);
      }
    });
  });
});
