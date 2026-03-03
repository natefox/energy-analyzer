"use client";

import { useState, useMemo } from "react";
import type { AnalysisResult, RatePlan, UtilityPlugin } from "@/lib/types";
import { formatCurrency, formatKwh } from "@/lib/utils";

interface Props {
  result: AnalysisResult;
  plugin: UtilityPlugin;
  selectedPlan: RatePlan;
}

interface BatteryPreset {
  name: string;
  capacityKwh: number;
  costUsd: number;
  roundTripEfficiency: number;
}

const PRESETS: BatteryPreset[] = [
  { name: "Tesla Powerwall 3", capacityKwh: 13.5, costUsd: 14500, roundTripEfficiency: 0.90 },
  { name: "Enphase IQ Battery 5P", capacityKwh: 5, costUsd: 7000, roundTripEfficiency: 0.90 },
  { name: "Enphase IQ Battery 10T", capacityKwh: 10, costUsd: 12000, roundTripEfficiency: 0.90 },
  { name: "Franklin WH aPower", capacityKwh: 13.6, costUsd: 15000, roundTripEfficiency: 0.89 },
];

export default function BatteryAnalyzer({ result, plugin, selectedPlan }: Props) {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customCapacity, setCustomCapacity] = useState(13.5);
  const [customCost, setCustomCost] = useState(14500);
  const [customEfficiency, setCustomEfficiency] = useState(90);
  const [useCustom, setUseCustom] = useState(false);

  const battery = useCustom
    ? { name: "Custom", capacityKwh: customCapacity, costUsd: customCost, roundTripEfficiency: customEfficiency / 100 }
    : PRESETS[selectedPreset];

  const analysis = useMemo(() => {
    // Strategy: store cheap energy (solar excess + super off-peak) and discharge during peak
    // For each day, calculate how much peak cost could be avoided

    let totalSavings = 0;
    let totalPeakDisplaced = 0;
    let totalCyclesUsed = 0;

    for (const day of result.dailyData) {
      const month = new Date(day.date + "T00:00:00").getMonth() + 1;
      const season = plugin.getSeason(month);
      const seasonRates = selectedPlan.seasons[season];

      // Peak rate (what we save by discharging)
      const peakPeriod = seasonRates.periods["peak"];
      const peakRate = peakPeriod ? peakPeriod.rate + (peakPeriod.fees || 0) : 0;
      const effectivePeakRate = selectedPlan.baselineCredit
        ? Math.max(0, peakRate - selectedPlan.baselineCredit)
        : peakRate;

      // Cheapest rate (what it costs to charge from grid if no solar)
      const rates = Object.values(seasonRates.periods).map(
        (p) => p.rate + (p.fees || 0) - (selectedPlan.baselineCredit || 0)
      );
      const cheapestRate = Math.max(0, Math.min(...rates));

      // Available energy to store: solar excess (generation) + we can charge from grid at cheap rate
      // For simplicity: battery charges from solar excess first, then from cheapest grid rate
      const usableCapacity = battery.capacityKwh * battery.roundTripEfficiency;
      const solarExcess = day.totalGeneration; // exported solar we could store instead

      // How much peak usage could we displace?
      const peakUsage = day.peakUsage + (day.midPeakUsage || 0);
      const displaced = Math.min(usableCapacity, peakUsage);

      if (displaced > 0) {
        // Savings = peak energy displaced * peak rate - charging cost
        const chargedFromSolar = Math.min(solarExcess, displaced / battery.roundTripEfficiency);
        const chargedFromGrid = (displaced / battery.roundTripEfficiency) - chargedFromSolar;

        const peakSavings = displaced * effectivePeakRate;
        const chargingCost = Math.max(0, chargedFromGrid) * cheapestRate;
        const netSavings = peakSavings - chargingCost;

        totalSavings += Math.max(0, netSavings);
        totalPeakDisplaced += displaced;
        totalCyclesUsed += displaced / battery.capacityKwh;
      }
    }

    const daysAnalyzed = result.daysAnalyzed;
    const annualSavings = daysAnalyzed > 0 ? (totalSavings / daysAnalyzed) * 365 : 0;
    const monthlySavings = annualSavings / 12;
    const paybackYears = annualSavings > 0 ? battery.costUsd / annualSavings : Infinity;
    const avgDailyCycles = daysAnalyzed > 0 ? totalCyclesUsed / daysAnalyzed : 0;
    // Typical warranty: 10 years. Calculate 10-year net.
    const tenYearSavings = annualSavings * 10 - battery.costUsd;
    const roi10Year = battery.costUsd > 0 ? (tenYearSavings / battery.costUsd) * 100 : 0;

    return {
      totalSavings,
      annualSavings,
      monthlySavings,
      paybackYears,
      totalPeakDisplaced,
      avgDailyCycles,
      tenYearSavings,
      roi10Year,
    };
  }, [result, plugin, selectedPlan, battery]);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="text-lg font-bold">Battery Storage ROI Calculator</h3>
        <p className="text-sm text-gray-500 mt-1">
          Estimate savings from adding a home battery based on your actual usage
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Battery selection */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Battery System:</label>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.name}
                onClick={() => { setSelectedPreset(i); setUseCustom(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  !useCustom && selectedPreset === i
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {preset.name}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                useCustom
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Battery specs */}
        {useCustom ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (kWh)</label>
              <input type="number" value={customCapacity} onChange={(e) => setCustomCapacity(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm" min={1} step={0.5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (installed)</label>
              <input type="number" value={customCost} onChange={(e) => setCustomCost(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm" min={0} step={100} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Round-trip Efficiency (%)</label>
              <input type="number" value={customEfficiency} onChange={(e) => setCustomEfficiency(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm" min={50} max={100} />
            </div>
          </div>
        ) : (
          <div className="flex gap-6 text-sm text-gray-600">
            <span>Capacity: <strong>{battery.capacityKwh} kWh</strong></span>
            <span>Cost: <strong>{formatCurrency(battery.costUsd)}</strong></span>
            <span>Efficiency: <strong>{(battery.roundTripEfficiency * 100).toFixed(0)}%</strong></span>
          </div>
        )}

        {/* Results */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="rounded-lg border border-emerald-100 p-4">
            <p className="text-sm font-medium text-emerald-600">Monthly Savings</p>
            <p className="text-2xl font-bold">{formatCurrency(analysis.monthlySavings)}</p>
            <p className="text-xs text-gray-500">estimated from your data</p>
          </div>
          <div className="rounded-lg border border-emerald-100 p-4">
            <p className="text-sm font-medium text-emerald-600">Annual Savings</p>
            <p className="text-2xl font-bold">{formatCurrency(analysis.annualSavings)}</p>
            <p className="text-xs text-gray-500">projected yearly</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-600">Payback Period</p>
            <p className="text-2xl font-bold">
              {analysis.paybackYears === Infinity ? "N/A" : `${analysis.paybackYears.toFixed(1)} yrs`}
            </p>
            <p className="text-xs text-gray-500">to recover {formatCurrency(battery.costUsd)}</p>
          </div>
          <div className={`rounded-lg border p-4 ${analysis.roi10Year > 0 ? "border-emerald-100" : "border-red-100"}`}>
            <p className={`text-sm font-medium ${analysis.roi10Year > 0 ? "text-emerald-600" : "text-red-500"}`}>10-Year ROI</p>
            <p className="text-2xl font-bold">{analysis.roi10Year.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">
              {analysis.tenYearSavings >= 0
                ? `Net gain: ${formatCurrency(analysis.tenYearSavings)}`
                : `Net loss: ${formatCurrency(Math.abs(analysis.tenYearSavings))}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-600">Peak Energy Displaced</p>
            <p className="text-2xl font-bold">{formatKwh(analysis.totalPeakDisplaced)}</p>
            <p className="text-xs text-gray-500">over {result.daysAnalyzed} days analyzed</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-600">Avg. Daily Cycles</p>
            <p className="text-2xl font-bold">{analysis.avgDailyCycles.toFixed(2)}</p>
            <p className="text-xs text-gray-500">of battery capacity used per day</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-600">Savings Over Data Period</p>
            <p className="text-2xl font-bold">{formatCurrency(analysis.totalSavings)}</p>
            <p className="text-xs text-gray-500">{result.daysAnalyzed} days of actual data</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 pt-2">
          Estimates assume daily charge/discharge cycle optimized for peak shaving. Actual savings depend on battery degradation, utility NEM policies, time-of-export rates, and usage patterns. Battery costs are approximate installed prices and may vary by region and installer.
        </p>
      </div>
    </div>
  );
}
