import type { RatePlan } from "@/lib/types";

const TOU_HOURS = {
  peak: {
    weekday: [{ start: 16, end: 21 }],
    weekend: [{ start: 16, end: 21 }],
  },
  offPeak: {
    weekday: [
      { start: 6, end: 16 },
      { start: 21, end: 24 },
    ],
    weekend: [
      { start: 14, end: 16 },
      { start: 21, end: 24 },
    ],
  },
  superOffPeak: {
    weekday: [{ start: 0, end: 6 }],
    weekend: [{ start: 0, end: 14 }],
  },
};

const SUMMER_MONTHS = [6, 7, 8, 9, 10];
const WINTER_MONTHS = [11, 12, 1, 2, 3, 4, 5];

export const sdgePlans: RatePlan[] = [
  // TOU Plans
  {
    id: "TOU-DR1",
    name: "TOU-DR1",
    description: "Standard Time-of-Use residential plan.",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.70519,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.47575,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.35524,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.56115,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.49928,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.48133,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "TOU-DR",
    name: "TOU-DR",
    description: "Time-of-Use base rate (generation component).",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.2854,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.217,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.14286,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.13647,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.07666,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.0593,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "TOU-DR-CARE",
    name: "TOU-DR-CARE",
    description: "CARE discount Time-of-Use plan.",
    monthlyCharge: 6.0,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.28222,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.28222,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.28222,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.41439,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.41439,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.41439,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
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
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.38826,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.14305,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06741,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.16516,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.1185,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06133,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "TOU-DR-SES",
    name: "TOU-DR-SES",
    description: "TOU solar/storage plan.",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.38826,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.14305,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06741,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.16516,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.1185,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06133,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "TOU-ELEC",
    name: "TOU-ELEC",
    description: "Electrification TOU plan for all-electric homes.",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.37729,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.10702,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.07145,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.20083,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.09735,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06501,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  // Tiered plans (same rate all periods)
  {
    id: "DR",
    name: "DR",
    description: "Standard tiered residential plan (non-TOU).",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.40685,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.40685,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.40685,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.40685,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.40685,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.40685,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "DR-LI",
    name: "DR-LI (FERA)",
    description: "FERA low-income tiered plan.",
    monthlyCharge: 12.08,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.26111,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.26111,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.26111,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.26111,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.26111,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.26111,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "DR-LI-CARE",
    name: "DR-LI-CARE",
    description: "CARE low-income tiered plan.",
    monthlyCharge: 6.0,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.19434,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.19434,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.19434,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.19434,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.19434,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.19434,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "DR-MB",
    name: "DR-MB",
    description: "Medical baseline tiered plan.",
    monthlyCharge: 24.15,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.30232,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.30232,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.30232,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.30232,
            label: "Baseline Rate",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.30232,
            label: "Baseline Rate",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.30232,
            label: "Baseline Rate",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  // EV Plans
  {
    id: "EV-TOU",
    name: "EV-TOU",
    description: "EV Time-of-Use plan with $16/mo vehicle fee.",
    monthlyCharge: 16.0,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.38826,
            fees: 0.30219,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.14305,
            fees: 0.1,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06741,
            fees: 0.05,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.16516,
            fees: 0.15,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.1185,
            fees: 0.08,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06133,
            fees: 0.04,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "EV-TOU-2",
    name: "EV-TOU-2",
    description: "EV TOU plan variant 2.",
    monthlyCharge: 16.0,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.38826,
            fees: 0.181,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.14305,
            fees: 0.08,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06741,
            fees: 0.04,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.16516,
            fees: 0.12,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.1185,
            fees: 0.06,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06133,
            fees: 0.03,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
  {
    id: "EV-TOU-5",
    name: "EV-TOU-5",
    description: "EV TOU plan variant 5.",
    monthlyCharge: 16.0,
    seasons: {
      summer: {
        months: SUMMER_MONTHS,
        periods: {
          peak: {
            rate: 0.38826,
            fees: 0.28402,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.14305,
            fees: 0.05728,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06741,
            fees: 0.05728,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
      winter: {
        months: WINTER_MONTHS,
        periods: {
          peak: {
            rate: 0.16516,
            fees: 0.18,
            label: "Peak (4-9pm)",
            hours: TOU_HOURS.peak,
          },
          offPeak: {
            rate: 0.1185,
            fees: 0.05,
            label: "Off-Peak",
            hours: TOU_HOURS.offPeak,
          },
          superOffPeak: {
            rate: 0.06133,
            fees: 0.05,
            label: "Super Off-Peak",
            hours: TOU_HOURS.superOffPeak,
          },
        },
      },
    },
  },
];
