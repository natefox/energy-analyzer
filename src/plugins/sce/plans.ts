import type { RatePlan } from "@/lib/types";

export const scePlans: RatePlan[] = [
  {
    id: "TOU-D-4-9PM",
    name: "TOU-D-4-9PM",
    description: "Default TOU plan with 4-9pm peak window.",
    monthlyCharge: 24.15,
    baselineCredit: 0.1,
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
              weekday: [
                { start: 0, end: 16 },
                { start: 21, end: 24 },
              ],
              weekend: [
                { start: 0, end: 16 },
                { start: 21, end: 24 },
              ],
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
              weekday: [
                { start: 0, end: 8 },
                { start: 21, end: 24 },
              ],
              weekend: [
                { start: 0, end: 8 },
                { start: 21, end: 24 },
              ],
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
    baselineCredit: 0.1,
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
              weekday: [
                { start: 0, end: 17 },
                { start: 20, end: 24 },
              ],
              weekend: [
                { start: 0, end: 17 },
                { start: 20, end: 24 },
              ],
            },
          },
        },
      },
      winter: {
        months: [10, 11, 12, 1, 2, 3, 4, 5],
        periods: {
          midPeak: {
            rate: 0.6,
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
              weekday: [
                { start: 0, end: 8 },
                { start: 20, end: 24 },
              ],
              weekend: [
                { start: 0, end: 8 },
                { start: 20, end: 24 },
              ],
            },
          },
        },
      },
    },
  },
  {
    id: "TOU-D-PRIME",
    name: "TOU-D-PRIME",
    description:
      "Best for EV, battery storage, or heat pump owners. Lowest off-peak rates.",
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
            rate: 0.4,
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
              weekday: [
                { start: 0, end: 16 },
                { start: 21, end: 24 },
              ],
              weekend: [
                { start: 0, end: 16 },
                { start: 21, end: 24 },
              ],
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
              weekday: [
                { start: 0, end: 8 },
                { start: 21, end: 24 },
              ],
              weekend: [
                { start: 0, end: 8 },
                { start: 21, end: 24 },
              ],
            },
          },
        },
      },
    },
  },
];
