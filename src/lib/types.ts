export type TouPeriod = "peak" | "offPeak" | "superOffPeak" | "midPeak";
export type Season = "summer" | "winter";
export type DayType = "weekday" | "weekend";
export type NemTier = "none" | "NEM1" | "NEM2" | "NEM3";

export interface IntervalRecord {
  date: Date;
  startTime: Date;
  endTime: Date;
  consumption: number;
  generation: number;
  net: number;
}

export interface TouSchedule {
  weekday: { start: number; end: number }[];
  weekend: { start: number; end: number }[];
}

export interface PeriodRate {
  rate: number;
  fees?: number;
  label: string;
  hours: TouSchedule;
}

export interface SeasonRates {
  months: number[];
  periods: Record<string, PeriodRate>;
}

export interface RatePlan {
  id: string;
  name: string;
  description: string;
  eligibility?: string;
  monthlyCharge: number;
  baselineCredit?: number;
  seasons: {
    summer: SeasonRates;
    winter: SeasonRates;
  };
}

export interface NemConfig {
  nem2NbcRate: number; // Non-bypassable charges for NEM2 ($/kWh)
  nem3ExportRates: {
    summer: Record<string, number>; // period → $/kWh export credit
    winter: Record<string, number>;
  };
}

export interface UtilityPlugin {
  id: string;
  name: string;
  shortName: string;
  detectCsv(text: string): boolean;
  parseCsv(text: string): IntervalRecord[];
  plans: RatePlan[];
  defaultPlanId: string;
  classifyInterval(date: Date, hour: number): string;
  getSeason(month: number): Season;
  summerMonths: number[];
  downloadInstructions: string[];
  downloadUrl: string;
  nemConfig: NemConfig;
}

export interface DailyData {
  date: string;
  peakCost: number;
  offPeakCost: number;
  superOffPeakCost: number;
  midPeakCost?: number;
  totalCost: number;
  peakUsage: number;
  offPeakUsage: number;
  superOffPeakUsage: number;
  midPeakUsage?: number;
  totalUsage: number;
  peakGeneration: number;
  offPeakGeneration: number;
  superOffPeakGeneration: number;
  totalGeneration: number;
  exportCredit: number;
}

export interface AnalysisResult {
  dailyData: DailyData[];
  totalCost: number;
  totalExportCredit: number;
  netCost: number;
  totalUsage: number;
  totalGeneration: number;
  avgDailyCost: number;
  avgDailyUsage: number;
  hourlyProfile: { weekday: number[]; weekend: number[] };
  dateRange: { start: string; end: string };
  daysAnalyzed: number;
  nemTier: NemTier;
}
