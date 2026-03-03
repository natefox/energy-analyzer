"use client";

import { useMemo } from "react";
import type { AnalysisResult, IntervalRecord, RatePlan, UtilityPlugin } from "@/lib/types";
import { formatCurrency, formatKwh } from "@/lib/utils";

interface Props {
  result: AnalysisResult;
  records: IntervalRecord[];
  plugin: UtilityPlugin;
  selectedPlan: RatePlan;
}

// Same solar profile as SolarAnalyzer
const SOLAR_HOURLY_PROFILE = [
  0, 0, 0, 0, 0, 0,
  0.02, 0.05, 0.08, 0.11,
  0.13, 0.14, 0.15, 0.14,
  0.12, 0.09, 0.05, 0.02,
  0, 0, 0, 0, 0, 0,
];

const COST_PER_WATT_SOLAR = 3.0;
const PEAK_SUN_HOURS = 5.5;
const SOLAR_EFFICIENCY = 0.85;
const ITC_RATE = 0.30;
const SOLAR_DEGRADATION = 0.005;
const BATTERY_EFFICIENCY = 0.90;
const BATTERY_COST_PER_KWH = 1100; // $/kWh installed (approximate market rate)

// Sweep ranges
const SOLAR_SIZES = [0, 2, 4, 6, 8, 10, 12, 14, 16];
const BATTERY_SIZES = [0, 5, 10, 13.5];

interface SizingResult {
  solarKw: number;
  batteryKwh: number;
  systemCost: number;
  annualSavings: number;
  paybackYears: number;
  roi25Year: number;
  selfConsumptionPct: number;
  annualExportKwh: number;
  billReductionPct: number;
}

function simulateSystem(
  solarKw: number,
  batteryKwh: number,
  records: IntervalRecord[],
  plugin: UtilityPlugin,
  selectedPlan: RatePlan,
  daysAnalyzed: number,
  currentAnnualCost: number,
): SizingResult {
  const dailyKwhPerKw = PEAK_SUN_HOURS * SOLAR_EFFICIENCY;
  const usableCapacity = batteryKwh * BATTERY_EFFICIENCY;

  let totalSavings = 0;
  let totalNewGeneration = 0;
  let totalSelfConsumed = 0;
  let totalExported = 0;

  // Track battery state per day
  let batteryCharge = 0;
  let currentDay = "";

  for (const record of records) {
    const dateKey = record.date.toISOString().split("T")[0];
    if (dateKey !== currentDay) {
      currentDay = dateKey;
      batteryCharge = 0; // Reset daily cycle
    }

    const hour = record.startTime.getHours();
    const month = record.startTime.getMonth() + 1;
    const season = plugin.getSeason(month);
    const period = plugin.classifyInterval(record.startTime, hour);

    const seasonRates = selectedPlan.seasons[season];
    const periodRate = seasonRates.periods[period];
    const rate = periodRate ? periodRate.rate + (periodRate.fees || 0) : 0;
    const effectiveRate = selectedPlan.baselineCredit
      ? Math.max(0, rate - selectedPlan.baselineCredit)
      : rate;

    const exportRate = plugin.nemConfig.nem3ExportRates[season][period] ?? 0;

    // Solar production this interval
    const intervalHours = (record.endTime.getTime() - record.startTime.getTime()) / (1000 * 60 * 60);
    const solarGen = solarKw * dailyKwhPerKw * SOLAR_HOURLY_PROFILE[hour] * intervalHours;
    totalNewGeneration += solarGen;

    // Self-consumption: offset grid usage directly
    const selfConsumed = Math.min(record.consumption, solarGen);
    const solarExcess = solarGen - selfConsumed;
    totalSelfConsumed += selfConsumed;

    // Battery charging from excess solar
    const chargeRoom = usableCapacity - batteryCharge;
    const charged = Math.min(solarExcess, chargeRoom);
    batteryCharge += charged;
    const exported = solarExcess - charged;
    totalExported += exported;

    // Battery discharge during peak/mid-peak
    let batteryDischarge = 0;
    if ((period === "peak" || period === "midPeak") && batteryCharge > 0) {
      const remainingGridNeed = record.consumption - selfConsumed;
      batteryDischarge = Math.min(batteryCharge, remainingGridNeed);
      batteryCharge -= batteryDischarge;
    }

    // Savings: self-consumed + battery discharge avoid retail rate, exports earn NEM3 rate
    totalSavings += selfConsumed * effectiveRate;
    totalSavings += batteryDischarge * effectiveRate;
    totalSavings += exported * exportRate;
  }

  const solarCostGross = solarKw * 1000 * COST_PER_WATT_SOLAR;
  const batteryCost = batteryKwh * BATTERY_COST_PER_KWH;
  const totalCostGross = solarCostGross + batteryCost;
  const itcSavings = totalCostGross * ITC_RATE;
  const systemCost = totalCostGross - itcSavings;

  const annualSavings = daysAnalyzed > 0 ? (totalSavings / daysAnalyzed) * 365 : 0;

  let lifetimeSavings = 0;
  for (let year = 0; year < 25; year++) {
    lifetimeSavings += annualSavings * Math.pow(1 - SOLAR_DEGRADATION, year);
  }

  const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
  const roi25Year = systemCost > 0 ? ((lifetimeSavings - systemCost) / systemCost) * 100 : 0;
  const selfConsumptionPct = totalNewGeneration > 0
    ? ((totalSelfConsumed + (totalNewGeneration - totalSelfConsumed - totalExported)) / totalNewGeneration) * 100
    : 0;
  const annualExportKwh = daysAnalyzed > 0 ? (totalExported / daysAnalyzed) * 365 : 0;
  const billReductionPct = currentAnnualCost > 0 ? (annualSavings / currentAnnualCost) * 100 : 0;

  return {
    solarKw,
    batteryKwh,
    systemCost,
    annualSavings,
    paybackYears,
    roi25Year,
    selfConsumptionPct,
    annualExportKwh,
    billReductionPct,
  };
}

export default function OptimalSizingGuide({ result, records, plugin, selectedPlan }: Props) {
  const analysis = useMemo(() => {
    const currentAnnualCost = result.daysAnalyzed > 0
      ? (result.netCost / result.daysAnalyzed) * 365
      : 0;

    // Run all combinations
    const allResults: SizingResult[] = [];
    for (const solarKw of SOLAR_SIZES) {
      for (const batteryKwh of BATTERY_SIZES) {
        if (solarKw === 0 && batteryKwh === 0) continue;
        allResults.push(
          simulateSystem(solarKw, batteryKwh, records, plugin, selectedPlan, result.daysAnalyzed, currentAnnualCost)
        );
      }
    }

    // Find best ROI (among options that pay back within 25 years)
    const viable = allResults.filter((r) => r.paybackYears <= 25);
    const bestRoi = viable.length > 0
      ? viable.reduce((best, r) => r.roi25Year > best.roi25Year ? r : best)
      : null;

    // Find fastest payback
    const fastestPayback = viable.length > 0
      ? viable.reduce((best, r) => r.paybackYears < best.paybackYears ? r : best)
      : null;

    // Find max bill reduction
    const maxReduction = allResults.reduce((best, r) =>
      r.billReductionPct > best.billReductionPct ? r : best
    );

    // Solar-only best
    const solarOnly = allResults
      .filter((r) => r.batteryKwh === 0)
      .reduce((best, r) => r.roi25Year > best.roi25Year ? r : best, allResults.filter((r) => r.batteryKwh === 0)[0]);

    // Best solar+battery combo
    const withBattery = allResults
      .filter((r) => r.batteryKwh > 0 && r.solarKw > 0)
      .reduce((best, r) => r.roi25Year > best.roi25Year ? r : best, allResults.filter((r) => r.batteryKwh > 0 && r.solarKw > 0)[0]);

    return { allResults, bestRoi, fastestPayback, maxReduction, solarOnly, withBattery, currentAnnualCost };
  }, [result, records, plugin, selectedPlan]);

  const { bestRoi, fastestPayback, maxReduction, solarOnly, withBattery, currentAnnualCost } = analysis;

  if (!bestRoi) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="text-lg font-bold">Optimal Solar + Battery Sizing</h3>
        <p className="text-sm text-gray-500 mt-2">
          Based on your usage data, none of the modeled solar/battery combinations would pay back within 25 years at current rates. This may indicate very low energy usage or already-low rates.
        </p>
      </div>
    );
  }

  function ResultCard({ title, color, r }: { title: string; color: string; r: SizingResult }) {
    return (
      <div className={`rounded-lg border ${color} p-4`}>
        <p className={`text-sm font-semibold mb-2 ${color.replace("border-", "text-").replace("100", "700")}`}>{title}</p>
        <div className="space-y-1 text-sm">
          <p><strong>{r.solarKw} kW solar</strong>{r.batteryKwh > 0 ? ` + ${r.batteryKwh} kWh battery` : " (no battery)"}</p>
          <p>System cost: <strong>{formatCurrency(r.systemCost)}</strong> <span className="text-xs text-gray-500">(after 30% ITC)</span></p>
          <p>Annual savings: <strong className="text-emerald-600">{formatCurrency(r.annualSavings)}</strong></p>
          <p>Payback: <strong>{r.paybackYears.toFixed(1)} years</strong></p>
          <p>25-year ROI: <strong>{r.roi25Year.toFixed(0)}%</strong></p>
          <p>Bill reduction: <strong>{r.billReductionPct.toFixed(0)}%</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="text-lg font-bold">Optimal Solar + Battery Sizing</h3>
        <p className="text-sm text-gray-500 mt-1">
          Recommendations based on your actual usage ({result.daysAnalyzed} days). Current annual cost: {formatCurrency(currentAnnualCost)}.
          All scenarios use NEM 3.0 rates and include 30% federal tax credit.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Top recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {bestRoi && <ResultCard title="Best ROI" color="border-emerald-100" r={bestRoi} />}
          {fastestPayback && fastestPayback !== bestRoi && (
            <ResultCard title="Fastest Payback" color="border-blue-100" r={fastestPayback} />
          )}
          {solarOnly && solarOnly !== bestRoi && (
            <ResultCard title="Best Solar Only" color="border-yellow-100" r={solarOnly} />
          )}
          {withBattery && withBattery !== bestRoi && withBattery !== fastestPayback && (
            <ResultCard title="Best Solar + Battery" color="border-purple-100" r={withBattery} />
          )}
          {maxReduction && maxReduction !== bestRoi && maxReduction !== fastestPayback && maxReduction.billReductionPct > bestRoi.billReductionPct + 10 && (
            <ResultCard title="Maximum Savings" color="border-red-100" r={maxReduction} />
          )}
        </div>

        {/* Key insight */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-emerald-800">Recommendation</p>
          <p className="text-sm text-emerald-700 mt-1">
            {bestRoi.batteryKwh > 0
              ? `A ${bestRoi.solarKw} kW solar system with ${bestRoi.batteryKwh} kWh battery offers the best return on investment. The battery helps by storing excess solar for peak hours when rates are highest, rather than exporting at low NEM 3.0 rates.`
              : `A ${bestRoi.solarKw} kW solar-only system offers the best ROI. At your current usage levels, battery storage doesn't improve the economics enough to justify the added cost.`}
            {bestRoi.selfConsumptionPct > 70
              ? " Your usage pattern aligns well with solar production hours, resulting in high self-consumption."
              : " Consider shifting more usage to solar hours (typically 9am-3pm) to increase self-consumption."}
          </p>
          {withBattery && withBattery.roi25Year > solarOnly.roi25Year && (
            <p className="text-sm text-emerald-700 mt-2">
              Adding a {withBattery.batteryKwh} kWh battery improves 25-year ROI from {solarOnly.roi25Year.toFixed(0)}% to {withBattery.roi25Year.toFixed(0)}% by capturing {formatKwh(solarOnly.annualExportKwh - withBattery.annualExportKwh)}/yr of solar that would otherwise be exported at low NEM 3.0 rates.
            </p>
          )}
        </div>

        {/* Comparison table */}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">View all combinations</summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-semibold text-gray-600 text-xs">Solar</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-xs">Battery</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-xs text-right">Cost</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-xs text-right">Annual Savings</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-xs text-right">Payback</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-xs text-right">25yr ROI</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-xs text-right">Bill %</th>
                </tr>
              </thead>
              <tbody>
                {analysis.allResults
                  .sort((a, b) => b.roi25Year - a.roi25Year)
                  .map((r, i) => (
                    <tr key={`${r.solarKw}-${r.batteryKwh}`} className={`border-t ${r === bestRoi ? "bg-emerald-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-3 py-2">{r.solarKw} kW</td>
                      <td className="px-3 py-2">{r.batteryKwh > 0 ? `${r.batteryKwh} kWh` : "—"}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(r.systemCost)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(r.annualSavings)}</td>
                      <td className="px-3 py-2 text-right">{r.paybackYears < 100 ? `${r.paybackYears.toFixed(1)} yr` : "N/A"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.roi25Year.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">{r.billReductionPct.toFixed(0)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="text-xs text-gray-400 pt-2">
          Estimates use $3.00/W solar, ${BATTERY_COST_PER_KWH}/kWh battery (installed), {PEAK_SUN_HOURS} peak sun hours, {(SOLAR_EFFICIENCY * 100).toFixed(0)}% system efficiency, {(BATTERY_EFFICIENCY * 100).toFixed(0)}% battery round-trip efficiency, {(SOLAR_DEGRADATION * 100).toFixed(1)}%/yr degradation, and 30% federal ITC. NEM 3.0 export rates applied. Actual results vary by location, roof orientation, shading, installer pricing, and utility rate changes.
        </p>
      </div>
    </div>
  );
}
