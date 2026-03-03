import type { UtilityPlugin } from "@/lib/types";
import { detectCsv, parseCsv } from "./parser";
import { classifyInterval, getSeason } from "./tou";
import { sdgePlans } from "./plans";

export const sdgePlugin: UtilityPlugin = {
  id: "sdge",
  name: "San Diego Gas & Electric",
  shortName: "SDG&E",
  detectCsv,
  parseCsv,
  plans: sdgePlans,
  defaultPlanId: "TOU-DR1",
  classifyInterval,
  getSeason,
  summerMonths: [6, 7, 8, 9, 10],
  downloadInstructions: [
    "Log in to your SDG&E My Account at sdge.com",
    "Navigate to Usage & Bills → Green Button Download",
    "Select your electric meter",
    "Choose your date range",
    "Click Export and download the CSV file",
  ],
  downloadUrl: "https://myaccount.sdge.com",
  nemConfig: {
    nem2NbcRate: 0.025, // ~$0.025/kWh non-bypassable charges
    nem3ExportRates: {
      summer: {
        peak: 0.065,
        offPeak: 0.045,
        superOffPeak: 0.035,
        midPeak: 0.055,
      },
      winter: {
        peak: 0.055,
        offPeak: 0.04,
        superOffPeak: 0.03,
        midPeak: 0.045,
      },
    },
  },
};
