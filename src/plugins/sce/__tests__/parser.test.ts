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
    it("parses interval records", () => {
      expect(parseCsv(SAMPLE_CSV)).toHaveLength(3);
    });
    it("maps Delivered to consumption", () => {
      expect(parseCsv(SAMPLE_CSV)[0].consumption).toBe(0.48);
    });
    it("maps Received to generation", () => {
      const r = parseCsv(SAMPLE_CSV)[2];
      expect(r.generation).toBe(0.34);
      expect(r.consumption).toBe(0);
    });
    it("computes net correctly", () => {
      expect(parseCsv(SAMPLE_CSV)[2].net).toBeCloseTo(-0.34);
    });
    it("parses quoted datetime with trailing spaces", () => {
      const r = parseCsv(SAMPLE_CSV)[0];
      expect(r.startTime.getMonth()).toBe(6);
      expect(r.startTime.getDate()).toBe(28);
      expect(r.startTime.getHours()).toBe(0);
    });
    it("parses AM/PM times without space", () => {
      expect(parseCsv(SAMPLE_CSV)[2].startTime.getHours()).toBe(8);
    });
  });
});
