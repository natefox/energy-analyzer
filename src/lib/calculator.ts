import type {
  IntervalRecord,
  NemTier,
  RatePlan,
  UtilityPlugin,
  AnalysisResult,
  DailyData,
} from "./types";

function getExportCreditRate(
  nemTier: NemTier,
  effectiveRate: number,
  period: string,
  season: "summer" | "winter",
  plugin: UtilityPlugin
): number {
  switch (nemTier) {
    case "NEM1":
      return effectiveRate; // Full retail credit
    case "NEM2":
      return Math.max(0, effectiveRate - plugin.nemConfig.nem2NbcRate);
    case "NEM3":
      return plugin.nemConfig.nem3ExportRates[season][period] ?? 0;
    default:
      return 0; // No export credit
  }
}

export function calculateCosts(
  records: IntervalRecord[],
  plan: RatePlan,
  plugin: UtilityPlugin,
  nemTier: NemTier = "none"
): AnalysisResult {
  const dailyMap = new Map<string, DailyData>();
  const hourlyWeekday = new Array(24).fill(0);
  const hourlyWeekend = new Array(24).fill(0);
  const hourlyWeekdayCount = new Array(24).fill(0);
  const hourlyWeekendCount = new Array(24).fill(0);

  for (const record of records) {
    const dateKey = record.date.toISOString().split("T")[0];
    const hour = record.startTime.getHours();
    const month = record.startTime.getMonth() + 1;
    const season = plugin.getSeason(month);
    const period = plugin.classifyInterval(record.startTime, hour);
    const isWeekend = record.startTime.getDay() === 0 || record.startTime.getDay() === 6;

    const seasonRates = plan.seasons[season];
    const periodRate = seasonRates.periods[period];
    const rate = periodRate ? periodRate.rate + (periodRate.fees || 0) : 0;
    let effectiveRate = rate;
    if (plan.baselineCredit) {
      effectiveRate = Math.max(0, rate - plan.baselineCredit);
    }
    const cost = record.consumption * effectiveRate;

    // Calculate export credit for solar generation
    const exportCreditRate = getExportCreditRate(nemTier, effectiveRate, period, season, plugin);
    const exportCredit = record.generation * exportCreditRate;

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        peakCost: 0,
        offPeakCost: 0,
        superOffPeakCost: 0,
        midPeakCost: 0,
        totalCost: 0,
        peakUsage: 0,
        offPeakUsage: 0,
        superOffPeakUsage: 0,
        midPeakUsage: 0,
        totalUsage: 0,
        peakGeneration: 0,
        offPeakGeneration: 0,
        superOffPeakGeneration: 0,
        totalGeneration: 0,
        exportCredit: 0,
      });
    }
    const day = dailyMap.get(dateKey)!;

    if (period === "peak") {
      day.peakCost += cost;
      day.peakUsage += record.consumption;
      day.peakGeneration += record.generation;
    } else if (period === "midPeak") {
      day.midPeakCost = (day.midPeakCost || 0) + cost;
      day.midPeakUsage = (day.midPeakUsage || 0) + record.consumption;
    } else if (period === "superOffPeak") {
      day.superOffPeakCost += cost;
      day.superOffPeakUsage += record.consumption;
      day.superOffPeakGeneration += record.generation;
    } else {
      day.offPeakCost += cost;
      day.offPeakUsage += record.consumption;
      day.offPeakGeneration += record.generation;
    }
    day.totalCost += cost;
    day.totalUsage += record.consumption;
    day.totalGeneration += record.generation;
    day.exportCredit += exportCredit;

    if (isWeekend) {
      hourlyWeekend[hour] += record.consumption;
      hourlyWeekendCount[hour]++;
    } else {
      hourlyWeekday[hour] += record.consumption;
      hourlyWeekdayCount[hour]++;
    }
  }

  const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const daysAnalyzed = dailyData.length;
  const dailyCharge = plan.monthlyCharge / 30;
  const totalFixedCharge = dailyCharge * daysAnalyzed;
  const totalUsageCost = dailyData.reduce((sum, d) => sum + d.totalCost, 0);
  const totalCost = totalUsageCost + totalFixedCharge;
  const totalUsage = dailyData.reduce((sum, d) => sum + d.totalUsage, 0);
  const totalGeneration = dailyData.reduce((sum, d) => sum + d.totalGeneration, 0);
  const totalExportCredit = dailyData.reduce((sum, d) => sum + d.exportCredit, 0);
  const netCost = totalCost - totalExportCredit;

  const weekdayProfile = hourlyWeekday.map((total, i) =>
    hourlyWeekdayCount[i] > 0 ? total / hourlyWeekdayCount[i] : 0
  );
  const weekendProfile = hourlyWeekend.map((total, i) =>
    hourlyWeekendCount[i] > 0 ? total / hourlyWeekendCount[i] : 0
  );
  const dates = dailyData.map((d) => d.date);

  return {
    dailyData,
    totalCost,
    totalExportCredit,
    netCost,
    totalUsage,
    totalGeneration,
    avgDailyCost: daysAnalyzed > 0 ? netCost / daysAnalyzed : 0,
    avgDailyUsage: daysAnalyzed > 0 ? totalUsage / daysAnalyzed : 0,
    hourlyProfile: { weekday: weekdayProfile, weekend: weekendProfile },
    dateRange: {
      start: dates[0] || "",
      end: dates[dates.length - 1] || "",
    },
    daysAnalyzed,
    nemTier,
  };
}

export function calculatePlanComparison(
  plan: RatePlan,
  monthlyKwh: number,
  peakPercent: number,
  season: "summer" | "winter"
): number {
  const seasonRates = plan.seasons[season];
  const periods = Object.entries(seasonRates.periods);
  const peakKwh = monthlyKwh * (peakPercent / 100);
  const remainingKwh = monthlyKwh - peakKwh;

  const peakPeriod = periods.find(([key]) => key === "peak" || key === "midPeak");
  const offPeakPeriod = periods.find(([key]) => key === "offPeak");
  const superOffPeakPeriod = periods.find(([key]) => key === "superOffPeak");

  let cost = 0;
  const getEffectiveRate = (periodRate: { rate: number; fees?: number }) => {
    const rate = periodRate.rate + (periodRate.fees || 0);
    return plan.baselineCredit ? Math.max(0, rate - plan.baselineCredit) : rate;
  };

  if (peakPeriod) cost += peakKwh * getEffectiveRate(peakPeriod[1]);

  if (offPeakPeriod) {
    const offPeakKwh = remainingKwh * 0.6;
    cost += offPeakKwh * getEffectiveRate(offPeakPeriod[1]);
  }

  if (superOffPeakPeriod) {
    cost += remainingKwh * 0.4 * getEffectiveRate(superOffPeakPeriod[1]);
  } else if (offPeakPeriod) {
    cost += remainingKwh * 0.4 * getEffectiveRate(offPeakPeriod[1]);
  }

  return cost + plan.monthlyCharge;
}
