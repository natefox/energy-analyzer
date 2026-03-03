import { calculateCosts, calculatePlanComparison } from "../calculator";
import type { IntervalRecord, RatePlan, UtilityPlugin } from "../types";

const mockPlugin = {
  classifyInterval: (date: Date, hour: number) => {
    if (hour >= 16 && hour < 21) return "peak";
    if (hour < 6) return "superOffPeak";
    return "offPeak";
  },
  getSeason: (month: number) =>
    month >= 6 && month <= 9 ? ("summer" as const) : ("winter" as const),
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
        peak: {
          rate: 0.5,
          label: "Peak",
          hours: { weekday: [], weekend: [] },
        },
        offPeak: {
          rate: 0.3,
          label: "Off-Peak",
          hours: { weekday: [], weekend: [] },
        },
        superOffPeak: {
          rate: 0.2,
          label: "Super Off-Peak",
          hours: { weekday: [], weekend: [] },
        },
      },
    },
    winter: {
      months: [10, 11, 12, 1, 2, 3, 4, 5],
      periods: {
        peak: {
          rate: 0.4,
          label: "Peak",
          hours: { weekday: [], weekend: [] },
        },
        offPeak: {
          rate: 0.25,
          label: "Off-Peak",
          hours: { weekday: [], weekend: [] },
        },
        superOffPeak: {
          rate: 0.15,
          label: "Super Off-Peak",
          hours: { weekday: [], weekend: [] },
        },
      },
    },
  },
};

describe("calculateCosts", () => {
  it("calculates cost for a single peak interval", () => {
    const records: IntervalRecord[] = [
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 17, 0),
        endTime: new Date(2025, 6, 15, 17, 15),
        consumption: 1.0,
        generation: 0,
        net: 1.0,
      },
    ];
    const result = calculateCosts(records, mockPlan, mockPlugin);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.dailyData).toHaveLength(1);
    expect(result.dailyData[0].peakCost).toBeCloseTo(0.5);
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
    expect(result.totalCost).toBeCloseTo(24.15 / 30, 1);
  });

  it("classifies intervals into correct TOU periods", () => {
    const records: IntervalRecord[] = [
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 17, 0),
        endTime: new Date(2025, 6, 15, 17, 15),
        consumption: 1.0,
        generation: 0,
        net: 1.0,
      },
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 10, 0),
        endTime: new Date(2025, 6, 15, 10, 15),
        consumption: 1.0,
        generation: 0,
        net: 1.0,
      },
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 3, 0),
        endTime: new Date(2025, 6, 15, 3, 15),
        consumption: 1.0,
        generation: 0,
        net: 1.0,
      },
    ];
    const result = calculateCosts(records, mockPlan, mockPlugin);
    expect(result.dailyData[0].peakUsage).toBeCloseTo(1.0);
    expect(result.dailyData[0].offPeakUsage).toBeCloseTo(1.0);
    expect(result.dailyData[0].superOffPeakUsage).toBeCloseTo(1.0);
  });

  it("applies baseline credit when present", () => {
    const planWithCredit: RatePlan = { ...mockPlan, baselineCredit: 0.1 };
    const records: IntervalRecord[] = [
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 17, 0),
        endTime: new Date(2025, 6, 15, 17, 15),
        consumption: 1.0,
        generation: 0,
        net: 1.0,
      },
    ];
    const result = calculateCosts(records, planWithCredit, mockPlugin);
    // Peak rate 0.50 - 0.10 credit = 0.40
    expect(result.dailyData[0].peakCost).toBeCloseTo(0.4);
  });

  it("tracks generation data", () => {
    const records: IntervalRecord[] = [
      {
        date: new Date(2025, 6, 15),
        startTime: new Date(2025, 6, 15, 10, 0),
        endTime: new Date(2025, 6, 15, 10, 15),
        consumption: 0,
        generation: 0.5,
        net: -0.5,
      },
    ];
    const result = calculateCosts(records, mockPlan, mockPlugin);
    expect(result.totalGeneration).toBeCloseTo(0.5);
  });

  it("computes hourly profiles", () => {
    const records: IntervalRecord[] = [
      {
        date: new Date(2025, 6, 15), // Tuesday
        startTime: new Date(2025, 6, 15, 10, 0),
        endTime: new Date(2025, 6, 15, 10, 15),
        consumption: 1.0,
        generation: 0,
        net: 1.0,
      },
    ];
    const result = calculateCosts(records, mockPlan, mockPlugin);
    expect(result.hourlyProfile.weekday[10]).toBeCloseTo(1.0);
  });
});

describe("calculatePlanComparison", () => {
  it("calculates monthly cost for given usage and peak percentage", () => {
    const cost = calculatePlanComparison(mockPlan, 500, 25, "summer");
    // 125 peak @ $0.50 = $62.50; 225 off-peak @ $0.30 = $67.50; 150 super off-peak @ $0.20 = $30; + $24.15
    expect(cost).toBeCloseTo(184.15, 0);
  });

  it("handles 0% peak usage", () => {
    const cost = calculatePlanComparison(mockPlan, 500, 0, "summer");
    // 0 peak; 300 off-peak @ $0.30 = $90; 200 super off-peak @ $0.20 = $40; + $24.15
    expect(cost).toBeCloseTo(154.15, 0);
  });

  it("handles 100% peak usage", () => {
    const cost = calculatePlanComparison(mockPlan, 500, 100, "summer");
    // 500 peak @ $0.50 = $250; + $24.15
    expect(cost).toBeCloseTo(274.15, 0);
  });

  it("applies baseline credit in comparison", () => {
    const planWithCredit: RatePlan = { ...mockPlan, baselineCredit: 0.1 };
    const cost = calculatePlanComparison(planWithCredit, 500, 25, "summer");
    // 125 peak @ $0.40 = $50; 225 off-peak @ $0.20 = $45; 150 super off-peak @ $0.10 = $15; + $24.15
    expect(cost).toBeCloseTo(134.15, 0);
  });
});
