"use client";

import { useMemo } from "react";
import type { IntervalRecord, RatePlan, UtilityPlugin } from "@/lib/types";
import { calculateCosts } from "@/lib/calculator";
import { formatCurrency } from "@/lib/utils";

interface Props {
  records: IntervalRecord[];
  plugin: UtilityPlugin;
  selectedPlanId: string;
}

interface PlanResult {
  plan: RatePlan;
  totalCost: number;
  dailyAvg: number;
  peakCost: number;
  offPeakCost: number;
  superOffPeakCost: number;
  midPeakCost: number;
}

export default function PlanComparisonTable({ records, plugin, selectedPlanId }: Props) {
  const planResults = useMemo(() => {
    const results: PlanResult[] = plugin.plans.map((plan) => {
      const result = calculateCosts(records, plan, plugin);
      const peakCost = result.dailyData.reduce((s, d) => s + d.peakCost, 0);
      const offPeakCost = result.dailyData.reduce((s, d) => s + d.offPeakCost, 0);
      const superOffPeakCost = result.dailyData.reduce((s, d) => s + d.superOffPeakCost, 0);
      const midPeakCost = result.dailyData.reduce((s, d) => s + (d.midPeakCost || 0), 0);

      return {
        plan,
        totalCost: result.totalCost,
        dailyAvg: result.avgDailyCost,
        peakCost,
        offPeakCost,
        superOffPeakCost,
        midPeakCost,
      };
    });

    return results.sort((a, b) => a.totalCost - b.totalCost);
  }, [records, plugin]);

  const selectedResult = planResults.find((r) => r.plan.id === selectedPlanId);
  const selectedCost = selectedResult?.totalCost ?? 0;
  const hasMidPeak = planResults.some((r) => r.midPeakCost > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="text-lg font-bold">Rate Plan Comparison</h3>
        <p className="text-sm text-gray-500 mt-1">
          All {plugin.shortName} plans calculated using your actual usage data, sorted by total cost
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs">Rate Plan</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">Total Cost</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">Daily Avg</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">Peak</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">Off-Peak</th>
              {hasMidPeak && (
                <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">Mid-Peak</th>
              )}
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">Super Off-Peak</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">Comparison</th>
            </tr>
          </thead>
          <tbody>
            {planResults.map((r, i) => {
              const isSelected = r.plan.id === selectedPlanId;
              const savings = selectedCost - r.totalCost;

              return (
                <tr
                  key={r.plan.id}
                  className={`border-t ${
                    isSelected ? "bg-emerald-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">
                      {r.plan.name}
                      {isSelected && (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{r.plan.description}</p>
                    {r.plan.eligibility && (
                      <p className="text-xs text-amber-600 mt-0.5">{r.plan.eligibility}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold">{formatCurrency(r.totalCost)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(r.dailyAvg)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(r.peakCost)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(r.offPeakCost)}</td>
                  {hasMidPeak && (
                    <td className="px-4 py-4 text-right">{formatCurrency(r.midPeakCost)}</td>
                  )}
                  <td className="px-4 py-4 text-right">{formatCurrency(r.superOffPeakCost)}</td>
                  <td className="px-4 py-4 text-right">
                    {isSelected ? (
                      <span className="text-gray-400">--</span>
                    ) : savings > 0 ? (
                      <span className="text-green-600 font-semibold">
                        Save {formatCurrency(savings)}
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold">
                        +{formatCurrency(Math.abs(savings))}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
