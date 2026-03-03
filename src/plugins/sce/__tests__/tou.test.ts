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
    it("classifies 5pm summer weekday as peak", () => {
      const date = new Date(2025, 6, 15, 17, 0);
      expect(classifyInterval(date, 17)).toBe("peak");
    });
    it("classifies 5pm summer weekend as midPeak", () => {
      const date = new Date(2025, 6, 13, 17, 0);
      expect(classifyInterval(date, 17)).toBe("midPeak");
    });
    it("classifies 10am summer weekday as offPeak", () => {
      const date = new Date(2025, 6, 15, 10, 0);
      expect(classifyInterval(date, 10)).toBe("offPeak");
    });
    it("classifies 5pm winter as midPeak", () => {
      const date = new Date(2025, 0, 15, 17, 0);
      expect(classifyInterval(date, 17)).toBe("midPeak");
    });
    it("classifies 10am winter as superOffPeak", () => {
      const date = new Date(2025, 0, 15, 10, 0);
      expect(classifyInterval(date, 10)).toBe("superOffPeak");
    });
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
