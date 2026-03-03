import type { UtilityPlugin } from "@/lib/types";
import { detectCsv, parseCsv } from "./parser";
import { classifyInterval, getSeason } from "./tou";
import { scePlans } from "./plans";

export const scePlugin: UtilityPlugin = {
  id: "sce",
  name: "Southern California Edison",
  shortName: "SCE",
  detectCsv,
  parseCsv,
  plans: scePlans,
  defaultPlanId: "TOU-D-4-9PM",
  classifyInterval,
  getSeason,
  summerMonths: [6, 7, 8, 9],
  downloadInstructions: [
    "Log in to your SCE account at sce.com",
    "Go to My Account → My Usage → Green Button Download",
    "Select 'Energy Usage' data type",
    "Choose your date range (up to 13 months)",
    "Download the CSV file",
  ],
  downloadUrl: "https://www.sce.com/mysce/myaccount",
};
