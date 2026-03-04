"use client";

import { useState, useMemo } from "react";
import type { AnalysisResult, IntervalRecord, RatePlan, UtilityPlugin } from "@/lib/types";
import { formatCurrency, formatKwh } from "@/lib/utils";

interface Props {
  result: AnalysisResult;
  records: IntervalRecord[];
  plugin: UtilityPlugin;
  selectedPlan: RatePlan;
}

// Typical SoCal hourly solar production as fraction of daily total
const SOLAR_HOURLY_PROFILE = [
  0,
  0,
  0,
  0,
  0,
  0, // 12am-5am
  0.02,
  0.05,
  0.08,
  0.11, // 6am-9am
  0.13,
  0.14,
  0.15,
  0.14, // 10am-1pm
  0.12,
  0.09,
  0.05,
  0.02, // 2pm-5pm
  0,
  0,
  0,
  0,
  0,
  0, // 6pm-11pm
];

const SYSTEM_SIZES = [
  { label: "4 kW", kw: 4 },
  { label: "6 kW", kw: 6 },
  { label: "8 kW", kw: 8 },
  { label: "10 kW", kw: 10 },
  { label: "12 kW", kw: 12 },
];

const COST_PER_WATT = 3.0; // $3/W average installed cost in SoCal
const PEAK_SUN_HOURS = 5.5; // SoCal average
const SYSTEM_EFFICIENCY = 0.85;
const ANNUAL_DEGRADATION = 0.005; // 0.5% per year panel degradation

export default function SolarAnalyzer({ result, records, plugin, selectedPlan }: Props) {
  const hasSolar = result.totalGeneration > 0;
  const [systemKw, setSystemKw] = useState(hasSolar ? 4 : 8);
  const [useCustom, setUseCustom] = useState(false);
  const [customKw, setCustomKw] = useState(8);

  const activeKw = useCustom ? customKw : systemKw;

  const analysis = useMemo(() => {
    // Daily production per kW = peak_sun_hours * efficiency
    const dailyKwhPerKw = PEAK_SUN_HOURS * SYSTEM_EFFICIENCY;

    // If user already has solar, estimate their current system size
    let existingKw = 0;
    if (hasSolar) {
      const avgDailyGen = result.totalGeneration / result.daysAnalyzed;
      existingKw = dailyKwhPerKw > 0 ? avgDailyGen / dailyKwhPerKw : 0;
    }

    // Simulate new solar production on top of existing setup
    // For each interval, calculate how much solar would be produced and how it offsets usage
    let totalNewGeneration = 0;
    let totalSelfConsumed = 0;
    let totalExported = 0;
    let totalSavings = 0;

    for (const record of records) {
      const hour = record.startTime.getHours();
      const month = record.startTime.getMonth() + 1;
      const season = plugin.getSeason(month);
      const period = plugin.classifyInterval(record.startTime, hour);

      // New solar production for this interval
      const hourlyFraction = SOLAR_HOURLY_PROFILE[hour];
      const intervalHours =
        (record.endTime.getTime() - record.startTime.getTime()) / (1000 * 60 * 60);
      const newGenKwh = activeKw * dailyKwhPerKw * hourlyFraction * intervalHours;
      totalNewGeneration += newGenKwh;

      // Determine what's available for self-consumption
      // For users with solar: consumption is already net (from grid), generation is existing export
      // New solar first offsets remaining grid consumption, then adds to export
      const gridConsumption = record.consumption;
      const selfConsumed = Math.min(gridConsumption, newGenKwh);
      const exported = newGenKwh - selfConsumed;
      totalSelfConsumed += selfConsumed;
      totalExported += exported;

      // Calculate savings
      const seasonRates = selectedPlan.seasons[season];
      const periodRate = seasonRates.periods[period];
      const rate = periodRate ? periodRate.rate + (periodRate.fees || 0) : 0;
      const effectiveRate = selectedPlan.baselineCredit
        ? Math.max(0, rate - selectedPlan.baselineCredit)
        : rate;

      // Self-consumed solar saves at retail rate (avoided grid purchase)
      const selfConsumptionSaving = selfConsumed * effectiveRate;

      // Exported solar earns NEM3 avoided cost rate (new systems go on NEM3)
      const exportRate = plugin.nemConfig.nem3ExportRates[season][period] ?? 0;
      const exportCredit = exported * exportRate;

      totalSavings += selfConsumptionSaving + exportCredit;
    }

    const systemCost = activeKw * 1000 * COST_PER_WATT;

    const annualSavings = result.daysAnalyzed > 0 ? (totalSavings / result.daysAnalyzed) * 365 : 0;

    // Calculate 25-year lifetime savings with degradation
    let lifetimeSavings = 0;
    for (let year = 0; year < 25; year++) {
      lifetimeSavings += annualSavings * Math.pow(1 - ANNUAL_DEGRADATION, year);
    }

    const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
    const roi25Year = systemCost > 0 ? ((lifetimeSavings - systemCost) / systemCost) * 100 : 0;
    const selfConsumptionPct =
      totalNewGeneration > 0 ? (totalSelfConsumed / totalNewGeneration) * 100 : 0;
    const monthlySavings = annualSavings / 12;

    return {
      existingKw,
      totalNewGeneration,
      totalSelfConsumed,
      totalExported,
      totalSavings,
      annualSavings,
      monthlySavings,
      systemCost,
      paybackYears,
      roi25Year,
      lifetimeSavings,
      selfConsumptionPct,
      dailyKwhPerKw,
    };
  }, [result, records, plugin, selectedPlan, activeKw, hasSolar]);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="text-lg font-bold">
          {hasSolar ? "Additional Solar ROI Calculator" : "Solar ROI Calculator"}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {hasSolar
            ? `You have an estimated ${analysis.existingKw.toFixed(1)} kW system. See what adding more panels would save under NEM 3.0.`
            : "Estimate savings from adding solar panels based on your actual usage. New systems are on NEM 3.0."}
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* System size selection */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700">
            {hasSolar ? "Additional" : "System"} Size:
          </label>
          <div className="flex gap-2 flex-wrap">
            {SYSTEM_SIZES.map((size) => (
              <button
                key={size.kw}
                onClick={() => {
                  setSystemKw(size.kw);
                  setUseCustom(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  !useCustom && systemKw === size.kw
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {size.label}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                useCustom
                  ? "border-yellow-500 bg-yellow-50 text-yellow-700 font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {useCustom && (
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">System Size (kW)</label>
            <input
              type="number"
              value={customKw}
              onChange={(e) => setCustomKw(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              min={1}
              max={50}
              step={0.5}
            />
          </div>
        )}

        {/* Production estimate */}
        <div className="text-sm">
          <span className="text-gray-600">
            Estimated production:{" "}
            <strong>{formatKwh(analysis.dailyKwhPerKw * activeKw)}/day</strong>
          </span>
        </div>

        {/* Cost and savings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="rounded-lg border border-yellow-100 p-4">
            <p className="text-sm font-medium text-yellow-600">System Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(analysis.systemCost)}</p>
            <p className="text-xs text-gray-500">estimated installed</p>
          </div>
          <div className="rounded-lg border border-emerald-100 p-4">
            <p className="text-sm font-medium text-emerald-600">Monthly Savings</p>
            <p className="text-2xl font-bold">{formatCurrency(analysis.monthlySavings)}</p>
            <p className="text-xs text-gray-500">estimated from your data</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-600">Payback Period</p>
            <p className="text-2xl font-bold">
              {analysis.paybackYears === Infinity
                ? "N/A"
                : `${analysis.paybackYears.toFixed(1)} yrs`}
            </p>
            <p className="text-xs text-gray-500">
              to recover {formatCurrency(analysis.systemCost)}
            </p>
          </div>
          <div
            className={`rounded-lg border p-4 ${analysis.roi25Year > 0 ? "border-emerald-100" : "border-red-100"}`}
          >
            <p
              className={`text-sm font-medium ${analysis.roi25Year > 0 ? "text-emerald-600" : "text-red-500"}`}
            >
              25-Year ROI
            </p>
            <p className="text-2xl font-bold">{analysis.roi25Year.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">
              {analysis.lifetimeSavings - analysis.systemCost >= 0
                ? `Net gain: ${formatCurrency(analysis.lifetimeSavings - analysis.systemCost)}`
                : `Net loss: ${formatCurrency(Math.abs(analysis.lifetimeSavings - analysis.systemCost))}`}
            </p>
          </div>
        </div>

        {/* Generation breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-yellow-100 p-4">
            <p className="text-sm font-medium text-yellow-600">New Generation</p>
            <p className="text-2xl font-bold">{formatKwh(analysis.totalNewGeneration)}</p>
            <p className="text-xs text-gray-500">over {result.daysAnalyzed} days analyzed</p>
          </div>
          <div className="rounded-lg border border-emerald-100 p-4">
            <p className="text-sm font-medium text-emerald-600">Self-Consumed</p>
            <p className="text-2xl font-bold">{analysis.selfConsumptionPct.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">
              {formatKwh(analysis.totalSelfConsumed)} used directly
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-600">Exported to Grid</p>
            <p className="text-2xl font-bold">{formatKwh(analysis.totalExported)}</p>
            <p className="text-xs text-gray-500">credited at NEM 3.0 rates</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 pt-2">
          Estimates use ${COST_PER_WATT.toFixed(2)}/W installed cost, {PEAK_SUN_HOURS} peak sun
          hours/day (SoCal avg), {(SYSTEM_EFFICIENCY * 100).toFixed(0)}% system efficiency, and{" "}
          {(ANNUAL_DEGRADATION * 100).toFixed(1)}% annual degradation. New solar installations are
          on NEM 3.0 (Net Billing Tariff). Actual costs and production vary by location, roof
          orientation, shading, and installer.
        </p>
      </div>
    </div>
  );
}
