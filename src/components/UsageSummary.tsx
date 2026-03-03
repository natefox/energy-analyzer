"use client";

import type { AnalysisResult } from "@/lib/types";
import { formatCurrency, formatKwh } from "@/lib/utils";

interface Props {
  result: AnalysisResult;
  hasSolar?: boolean;
}

function formatHourRange(hour: number): string {
  const fmt = (h: number) => {
    if (h === 0 || h === 24) return "12:00";
    if (h === 12) return "12:00";
    return h < 12 ? `${h}:00` : `${h - 12}:00`;
  };
  return `${fmt(hour)} - ${fmt(hour + 1)}`;
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export default function UsageSummary({ result, hasSolar }: Props) {
  // Aggregate period totals from daily data
  const totals = result.dailyData.reduce(
    (acc, d) => ({
      peakUsage: acc.peakUsage + d.peakUsage,
      offPeakUsage: acc.offPeakUsage + d.offPeakUsage,
      superOffPeakUsage: acc.superOffPeakUsage + d.superOffPeakUsage,
      midPeakUsage: acc.midPeakUsage + (d.midPeakUsage || 0),
      peakCost: acc.peakCost + d.peakCost,
      offPeakCost: acc.offPeakCost + d.offPeakCost,
      superOffPeakCost: acc.superOffPeakCost + d.superOffPeakCost,
      midPeakCost: acc.midPeakCost + (d.midPeakCost || 0),
    }),
    { peakUsage: 0, offPeakUsage: 0, superOffPeakUsage: 0, midPeakUsage: 0, peakCost: 0, offPeakCost: 0, superOffPeakCost: 0, midPeakCost: 0 }
  );

  // Find peak usage hour from hourly profiles (combined weekday + weekend)
  const combinedHourly = result.hourlyProfile.weekday.map(
    (v, i) => v + result.hourlyProfile.weekend[i]
  );
  const peakHourIndex = combinedHourly.indexOf(Math.max(...combinedHourly));
  const peakHourAvg =
    (result.hourlyProfile.weekday[peakHourIndex] + result.hourlyProfile.weekend[peakHourIndex]) / 2;

  // Find lowest usage 3-hour window
  let lowestSum = Infinity;
  let lowestStart = 0;
  for (let i = 0; i < 24; i++) {
    const sum =
      combinedHourly[i] +
      combinedHourly[(i + 1) % 24] +
      combinedHourly[(i + 2) % 24];
    if (sum < lowestSum) {
      lowestSum = sum;
      lowestStart = i;
    }
  }
  const lowestAvg = lowestSum / 6; // avg per hour across weekday+weekend, /2 for avg, *3 hours /3

  // Most efficient time period (lowest cost as % of total)
  const periodCosts = [
    { name: "Peak", cost: totals.peakCost },
    { name: "Off-Peak", cost: totals.offPeakCost },
    { name: "Super Off-Peak", cost: totals.superOffPeakCost },
  ];
  if (totals.midPeakCost > 0) {
    periodCosts.push({ name: "Mid-Peak", cost: totals.midPeakCost });
  }
  const totalCostFromPeriods = periodCosts.reduce((s, p) => s + p.cost, 0);
  const mostEfficient = periodCosts.reduce((best, p) =>
    p.cost > best.cost ? p : best
  );

  const hasMidPeak = totals.midPeakUsage > 0;

  // Build period cards
  const periodCards = [
    {
      label: "Peak Hours",
      color: "text-red-500",
      borderColor: "border-red-100",
      usage: totals.peakUsage,
      cost: totals.peakCost,
    },
    ...(hasMidPeak
      ? [
          {
            label: "Mid-Peak Hours",
            color: "text-orange-500",
            borderColor: "border-orange-100",
            usage: totals.midPeakUsage,
            cost: totals.midPeakCost,
          },
        ]
      : []),
    {
      label: "Off-Peak Hours",
      color: "text-blue-500",
      borderColor: "border-blue-100",
      usage: totals.offPeakUsage,
      cost: totals.offPeakCost,
    },
    {
      label: "Super Off-Peak Hours",
      color: "text-green-500",
      borderColor: "border-green-100",
      usage: totals.superOffPeakUsage,
      cost: totals.superOffPeakCost,
    },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border space-y-5">
      <h3 className="text-lg font-bold">Your Usage Summary</h3>

      {/* Top row: Total + period breakdowns */}
      <div className={`grid grid-cols-2 ${hasMidPeak ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3`}>
        {/* Total */}
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-emerald-600">Total Usage</p>
          <p className="text-2xl font-bold">{formatKwh(result.totalUsage)}</p>
          <p className="text-xs text-gray-500">Over {result.daysAnalyzed} days</p>
          {result.totalExportCredit > 0 ? (
            <>
              <p className="text-sm font-semibold text-emerald-600 mt-2">
                {formatCurrency(result.netCost)}
              </p>
              <p className="text-xs text-gray-500">
                Net cost ({formatCurrency(result.totalCost)} - {formatCurrency(result.totalExportCredit)} credits)
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-emerald-600 mt-2">
                {formatCurrency(result.totalCost)}
              </p>
              <p className="text-xs text-gray-500">
                Average {formatCurrency(result.avgDailyCost)}/day
              </p>
            </>
          )}
        </div>

        {/* Period cards */}
        {periodCards.map((card) => (
          <div key={card.label} className={`rounded-lg border ${card.borderColor} p-4`}>
            <p className={`text-sm font-medium ${card.color}`}>{card.label}</p>
            <p className="text-2xl font-bold">{formatKwh(card.usage)}</p>
            <p className="text-xs text-gray-500">
              {pct(card.usage, result.totalUsage)} of total usage
            </p>
            <p className={`text-sm font-semibold ${card.color} mt-2`}>
              {formatCurrency(card.cost)}
            </p>
            <p className="text-xs text-gray-500">
              {pct(card.cost, totalCostFromPeriods)} of total cost
            </p>
          </div>
        ))}
      </div>

      {/* Bottom row: Peak hour, lowest usage, most efficient */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-emerald-600">Peak Usage Hour</p>
          <p className="text-2xl font-bold">{formatHourRange(peakHourIndex)}</p>
          <p className="text-xs text-gray-500">
            Avg. {formatKwh(peakHourAvg)} (
            {pct(peakHourAvg * result.daysAnalyzed, result.totalUsage)} of daily use)
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-emerald-600">Lowest Usage Period</p>
          <p className="text-2xl font-bold">
            {formatHourRange(lowestStart).split(" - ")[0]} -{" "}
            {formatHourRange(lowestStart + 2).split(" - ")[1]}
          </p>
          <p className="text-xs text-gray-500">
            Avg. {formatKwh(lowestAvg)} during this period
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-emerald-600">Most Efficient Time</p>
          <p className="text-2xl font-bold">{mostEfficient.name}</p>
          <p className="text-xs text-gray-500">
            {pct(mostEfficient.cost, totalCostFromPeriods)} of total cost
          </p>
        </div>
      </div>

      {/* Solar generation summary */}
      {hasSolar && result.totalGeneration > 0 && (() => {
        const genTotals = result.dailyData.reduce(
          (acc, d) => ({
            peak: acc.peak + d.peakGeneration,
            offPeak: acc.offPeak + d.offPeakGeneration,
            superOffPeak: acc.superOffPeak + d.superOffPeakGeneration,
          }),
          { peak: 0, offPeak: 0, superOffPeak: 0 }
        );
        const avgDailyGen = result.totalGeneration / result.daysAnalyzed;
        const selfConsumptionPct = result.totalUsage > 0
          ? Math.min(100, (result.totalGeneration / (result.totalUsage + result.totalGeneration)) * 100)
          : 0;

        return (
          <div className="border-t pt-5">
            <h4 className="text-lg font-bold flex items-center gap-2">
              <span className="text-yellow-500">&#9728;</span> Solar Generation Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div className="rounded-lg border border-yellow-100 p-4">
                <p className="text-sm font-medium text-yellow-600">Total Generated</p>
                <p className="text-2xl font-bold">{formatKwh(result.totalGeneration)}</p>
                <p className="text-xs text-gray-500">Over {result.daysAnalyzed} days</p>
                <p className="text-sm font-semibold text-yellow-600 mt-2">
                  Avg. {formatKwh(avgDailyGen)}/day
                </p>
              </div>
              <div className="rounded-lg border border-red-100 p-4">
                <p className="text-sm font-medium text-red-500">Peak Generation</p>
                <p className="text-2xl font-bold">{formatKwh(genTotals.peak)}</p>
                <p className="text-xs text-gray-500">
                  {pct(genTotals.peak, result.totalGeneration)} of solar
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 p-4">
                <p className="text-sm font-medium text-blue-500">Off-Peak Generation</p>
                <p className="text-2xl font-bold">{formatKwh(genTotals.offPeak)}</p>
                <p className="text-xs text-gray-500">
                  {pct(genTotals.offPeak, result.totalGeneration)} of solar
                </p>
              </div>
              <div className="rounded-lg border border-green-100 p-4">
                <p className="text-sm font-medium text-green-500">Super Off-Peak Gen.</p>
                <p className="text-2xl font-bold">{formatKwh(genTotals.superOffPeak)}</p>
                <p className="text-xs text-gray-500">
                  {pct(genTotals.superOffPeak, result.totalGeneration)} of solar
                </p>
              </div>
            </div>
            <div className={`grid grid-cols-1 ${result.totalExportCredit > 0 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-3 mt-3`}>
              <div className="rounded-lg border border-yellow-100 p-4">
                <p className="text-sm font-medium text-yellow-600">Solar Offset</p>
                <p className="text-2xl font-bold">{selfConsumptionPct.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">
                  of total energy came from solar
                </p>
              </div>
              <div className="rounded-lg border border-yellow-100 p-4">
                {result.totalUsage >= result.totalGeneration ? (
                  <>
                    <p className="text-sm font-medium text-yellow-600">Net Grid Usage</p>
                    <p className="text-2xl font-bold">{formatKwh(result.totalUsage - result.totalGeneration)}</p>
                    <p className="text-xs text-gray-500">
                      Grid consumption after solar offset
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-green-600">Net Exported</p>
                    <p className="text-2xl font-bold text-green-600">{formatKwh(result.totalGeneration - result.totalUsage)}</p>
                    <p className="text-xs text-gray-500">
                      Solar exported more than consumed from grid
                    </p>
                  </>
                )}
              </div>
              {result.totalExportCredit > 0 && (
                <div className="rounded-lg border border-green-100 p-4">
                  <p className="text-sm font-medium text-green-600">Export Credit ({result.nemTier})</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(result.totalExportCredit)}</p>
                  <p className="text-xs text-gray-500">
                    Avg. {formatCurrency(result.totalExportCredit / result.daysAnalyzed)}/day from solar exports
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
