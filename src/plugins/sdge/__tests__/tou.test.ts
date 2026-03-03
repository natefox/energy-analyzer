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
    it("classifies 5pm weekday as peak", () => {
      const date = new Date(2024, 6, 15, 17, 0);
      expect(classifyInterval(date, 17)).toBe("peak");
    });
    it("classifies 6pm weekend as peak", () => {
      const date = new Date(2024, 6, 13, 18, 0);
      expect(classifyInterval(date, 18)).toBe("peak");
    });
    it("classifies 10am weekday as offPeak", () => {
      const date = new Date(2024, 6, 15, 10, 0);
      expect(classifyInterval(date, 10)).toBe("offPeak");
    });
    it("classifies 10pm weekday as offPeak", () => {
      const date = new Date(2024, 6, 15, 22, 0);
      expect(classifyInterval(date, 22)).toBe("offPeak");
    });
    it("classifies 3am weekday as superOffPeak", () => {
      const date = new Date(2024, 6, 15, 3, 0);
      expect(classifyInterval(date, 3)).toBe("superOffPeak");
    });
    it("classifies 10am weekend as superOffPeak", () => {
      const date = new Date(2024, 6, 13, 10, 0);
      expect(classifyInterval(date, 10)).toBe("superOffPeak");
    });
    it("classifies 3pm weekend as offPeak", () => {
      const date = new Date(2024, 6, 13, 15, 0);
      expect(classifyInterval(date, 15)).toBe("offPeak");
    });
  });
});
