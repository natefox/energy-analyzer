"use client";

import { useMemo } from "react";
import type { AnalysisResult, IntervalRecord, RatePlan, UtilityPlugin } from "@/lib/types";
import { calculateCosts } from "@/lib/calculator";
import { formatCurrency, formatKwh } from "@/lib/utils";

interface Props {
  result: AnalysisResult;
  records: IntervalRecord[];
  plugin: UtilityPlugin;
  selectedPlan: RatePlan;
}

interface Tip {
  icon: string;
  title: string;
  detail: string;
  impact?: string;
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export default function UsageAdvice({ result, records, plugin, selectedPlan }: Props) {
  const tips = useMemo(() => {
    const advice: Tip[] = [];

    // --- Aggregate period totals ---
    const totals = result.dailyData.reduce(
      (acc, d) => ({
        peakUsage: acc.peakUsage + d.peakUsage,
        offPeakUsage: acc.offPeakUsage + d.offPeakUsage,
        superOffPeakUsage: acc.superOffPeakUsage + d.superOffPeakUsage,
        midPeakUsage: acc.midPeakUsage + (d.midPeakUsage || 0),
        peakCost: acc.peakCost + d.peakCost,
        offPeakCost: acc.offPeakCost + d.offPeakCost,
        superOffPeakCost: acc.superOffPeakCost + d.superOffPeakCost,
      }),
      {
        peakUsage: 0,
        offPeakUsage: 0,
        superOffPeakUsage: 0,
        midPeakUsage: 0,
        peakCost: 0,
        offPeakCost: 0,
        superOffPeakCost: 0,
      }
    );
    const peakPct = result.totalUsage > 0 ? (totals.peakUsage / result.totalUsage) * 100 : 0;

    // --- Cheapest plan check (use net cost when NEM is active) ---
    const planCosts = plugin.plans.map((plan) => {
      const r = calculateCosts(records, plan, plugin, result.nemTier);
      return { plan, cost: r.netCost };
    });
    planCosts.sort((a, b) => a.cost - b.cost);
    const cheapest = planCosts[0];
    const currentCost =
      planCosts.find((p) => p.plan.id === selectedPlan.id)?.cost ?? result.netCost;

    if (cheapest && cheapest.plan.id !== selectedPlan.id) {
      const savings = currentCost - cheapest.cost;
      if (savings > 1) {
        const monthlyEst = (savings / result.daysAnalyzed) * 30;
        advice.push({
          icon: "\u{1F4B0}",
          title: `Switch to ${cheapest.plan.name}`,
          detail: `Based on your actual usage, ${cheapest.plan.name} would have been the cheapest plan over this period.${cheapest.plan.eligibility ? ` Note: ${cheapest.plan.eligibility}` : ""}`,
          impact: `Save ${formatCurrency(savings)} over ${result.daysAnalyzed} days (~${formatCurrency(monthlyEst)}/mo)`,
        });
      }
    }

    // --- Peak usage advice ---
    if (peakPct > 30) {
      const peakPeriod =
        selectedPlan.seasons.summer.periods["peak"] || selectedPlan.seasons.winter.periods["peak"];
      const peakHours = peakPeriod?.hours?.weekday?.[0];
      const peakWindow = peakHours
        ? `${formatHour(peakHours.start)}-${formatHour(peakHours.end)}`
        : "peak hours";

      // Estimate savings if 20% of peak shifted to off-peak
      const shiftableKwh = totals.peakUsage * 0.2;
      const avgPeakRate = totals.peakUsage > 0 ? totals.peakCost / totals.peakUsage : 0;
      const avgOffPeakRate = totals.offPeakUsage > 0 ? totals.offPeakCost / totals.offPeakUsage : 0;
      const shiftSavings = shiftableKwh * (avgPeakRate - avgOffPeakRate);

      advice.push({
        icon: "\u{23F0}",
        title: `Shift usage away from ${peakWindow}`,
        detail: `${peakPct.toFixed(0)}% of your energy is consumed during peak hours, which are the most expensive. Run dishwashers, laundry, and EV charging outside this window.`,
        impact:
          shiftSavings > 1
            ? `Shifting just 20% could save ~${formatCurrency(shiftSavings)} over this period`
            : undefined,
      });
    }

    // --- Highest usage hours ---
    const combined = result.hourlyProfile.weekday.map(
      (v, i) => v + result.hourlyProfile.weekend[i]
    );
    const maxHourIdx = combined.indexOf(Math.max(...combined));
    const maxHourAvg =
      (result.hourlyProfile.weekday[maxHourIdx] + result.hourlyProfile.weekend[maxHourIdx]) / 2;
    const period = plugin.classifyInterval(new Date(2024, 6, 1, maxHourIdx), maxHourIdx); // summer weekday

    if (period === "peak" || period === "midPeak") {
      advice.push({
        icon: "\u{26A1}",
        title: `Your heaviest usage is at ${formatHour(maxHourIdx)} (during ${period === "peak" ? "peak" : "mid-peak"})`,
        detail: `You average ${formatKwh(maxHourAvg)} at ${formatHour(maxHourIdx)}, which falls in an expensive rate period. Identify what's running at that time and consider scheduling it earlier or later.`,
      });
    }

    // --- Weekday vs weekend pattern ---
    const weekdayTotal = result.hourlyProfile.weekday.reduce((s, v) => s + v, 0);
    const weekendTotal = result.hourlyProfile.weekend.reduce((s, v) => s + v, 0);
    if (weekdayTotal > 0 && weekendTotal > 0) {
      const ratio = weekendTotal / weekdayTotal;
      if (ratio > 1.3) {
        advice.push({
          icon: "\u{1F4C5}",
          title: "Weekend usage is significantly higher",
          detail: `Your average weekend usage is ${((ratio - 1) * 100).toFixed(0)}% higher than weekdays. Weekend rates are often lower, but check if your plan has mid-peak weekend hours that could still be costly.`,
        });
      } else if (ratio < 0.7) {
        advice.push({
          icon: "\u{1F4C5}",
          title: "Consider shifting more usage to weekends",
          detail: `Your weekday usage is much higher than weekends. Many TOU plans have cheaper weekend rates. Scheduling laundry, EV charging, or pool pumps on weekends could reduce costs.`,
        });
      }
    }

    // --- Solar-specific advice ---
    const hasSolar = result.totalGeneration > 0;
    if (hasSolar) {
      // Find peak solar generation hours
      const genByHour = new Array(24).fill(0);
      const genCounts = new Array(24).fill(0);
      for (const record of records) {
        if (record.generation > 0) {
          const h = record.startTime.getHours();
          genByHour[h] += record.generation;
          genCounts[h]++;
        }
      }
      const avgGen = genByHour.map((total, i) => (genCounts[i] > 0 ? total / genCounts[i] : 0));
      const peakGenHour = avgGen.indexOf(Math.max(...avgGen));

      // Find hours with best solar
      const goodSolarHours = avgGen
        .map((v, i) => ({ hour: i, gen: v }))
        .filter((h) => h.gen > avgGen[peakGenHour] * 0.5)
        .sort((a, b) => a.hour - b.hour);

      if (goodSolarHours.length >= 2) {
        const solarStart = goodSolarHours[0].hour;
        const solarEnd = goodSolarHours[goodSolarHours.length - 1].hour + 1;
        advice.push({
          icon: "\u{2600}\u{FE0F}",
          title: `Run heavy loads between ${formatHour(solarStart)}-${formatHour(solarEnd)}`,
          detail: `Your solar generation peaks around ${formatHour(peakGenHour)}. Running energy-intensive appliances (EV charging, pool pump, laundry, dishwasher) during ${formatHour(solarStart)}-${formatHour(solarEnd)} maximizes self-consumption and reduces grid costs.`,
        });
      }

      if (result.totalGeneration > result.totalUsage) {
        advice.push({
          icon: "\u{1F50B}",
          title: "Consider battery storage",
          detail: `You exported ${formatKwh(result.totalGeneration - result.totalUsage)} more than you consumed from the grid. A home battery could store excess solar for use during peak hours instead of exporting it at lower NEM rates.`,
        });
      }

      // NEM3-specific advice
      if (result.nemTier === "NEM3" && result.totalExportCredit > 0) {
        const avgExportRate = result.totalExportCredit / result.totalGeneration;
        advice.push({
          icon: "\u{1F4CA}",
          title: "NEM 3.0 export rates are low — maximize self-consumption",
          detail: `Your average export credit is ${(avgExportRate * 100).toFixed(1)}\u00A2/kWh, much less than retail rates. Shift heavy loads to solar hours and consider battery storage to use your solar power during expensive peak hours rather than exporting at low rates.`,
        });
      }
    }

    // --- Super off-peak underutilization ---
    const superOffPeakPct =
      result.totalUsage > 0 ? (totals.superOffPeakUsage / result.totalUsage) * 100 : 0;
    if (superOffPeakPct < 15 && totals.superOffPeakUsage > 0) {
      advice.push({
        icon: "\u{1F319}",
        title: "Take advantage of super off-peak rates",
        detail: `Only ${superOffPeakPct.toFixed(0)}% of your usage falls in super off-peak hours, which have the lowest rates. Schedule EV charging, water heater pre-heating, or other deferrable loads to these hours.`,
      });
    }

    return advice;
  }, [result, records, plugin, selectedPlan]);

  if (tips.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="text-lg font-bold">Personalized Recommendations</h3>
        <p className="text-sm text-gray-500 mt-1">
          Based on your actual usage data over {result.daysAnalyzed} days
        </p>
      </div>
      <div className="divide-y">
        {tips.map((tip, i) => (
          <div key={i} className="p-5 flex gap-4">
            <div className="text-2xl flex-shrink-0 mt-0.5">{tip.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{tip.title}</p>
              <p className="text-sm text-gray-600 mt-1">{tip.detail}</p>
              {tip.impact && (
                <p className="text-sm font-medium text-emerald-600 mt-2">{tip.impact}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
