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
      expect(records[0].startTime.getMonth()).toBe(4);
      expect(records[0].startTime.getDate()).toBe(25);
      expect(records[0].startTime.getHours()).toBe(0);
      expect(records[0].startTime.getMinutes()).toBe(0);
    });
  });
});
