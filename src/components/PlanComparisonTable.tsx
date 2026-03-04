"use client";

import { useMemo } from "react";
import type { IntervalRecord, NemTier, RatePlan, UtilityPlugin } from "@/lib/types";
import { calculateCosts } from "@/lib/calculator";
import { formatCurrency } from "@/lib/utils";

interface Props {
  records: IntervalRecord[];
  plugin: UtilityPlugin;
  selectedPlanId: string;
  nemTier: NemTier;
}

interface PlanResult {
  plan: RatePlan;
  totalCost: number;
  exportCredit: number;
  netCost: number;
  dailyAvg: number;
  peakCost: number;
  offPeakCost: number;
  superOffPeakCost: number;
  midPeakCost: number;
}

export default function PlanComparisonTable({ records, plugin, selectedPlanId, nemTier }: Props) {
  const planResults = useMemo(() => {
    const results: PlanResult[] = plugin.plans.map((plan) => {
      const result = calculateCosts(records, plan, plugin, nemTier);
      const peakCost = result.dailyData.reduce((s, d) => s + d.peakCost, 0);
      const offPeakCost = result.dailyData.reduce((s, d) => s + d.offPeakCost, 0);
      const superOffPeakCost = result.dailyData.reduce((s, d) => s + d.superOffPeakCost, 0);
      const midPeakCost = result.dailyData.reduce((s, d) => s + (d.midPeakCost || 0), 0);

      return {
        plan,
        totalCost: result.totalCost,
        exportCredit: result.totalExportCredit,
        netCost: result.netCost,
        dailyAvg: result.avgDailyCost,
        peakCost,
        offPeakCost,
        superOffPeakCost,
        midPeakCost,
      };
    });

    return results.sort((a, b) => a.netCost - b.netCost);
  }, [records, plugin, nemTier]);

  const selectedResult = planResults.find((r) => r.plan.id === selectedPlanId);
  const selectedNetCost = selectedResult?.netCost ?? 0;
  const hasMidPeak = planResults.some((r) => r.midPeakCost > 0);
  const hasExportCredits = planResults.some((r) => r.exportCredit > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="text-lg font-bold">Rate Plan Comparison</h3>
        <p className="text-sm text-gray-500 mt-1">
          All {plugin.shortName} plans calculated using your actual usage data, sorted by{" "}
          {hasExportCredits ? "net" : "total"} cost
          {hasExportCredits && ` (${nemTier} export credits applied)`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs">Rate Plan</th>
              {hasExportCredits ? (
                <>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                    Grid Cost
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                    Export Credit
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                    Net Cost
                  </th>
                </>
              ) : (
                <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                  Total Cost
                </th>
              )}
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                Daily Avg
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                Peak
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                Off-Peak
              </th>
              {hasMidPeak && (
                <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                  Mid-Peak
                </th>
              )}
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                Super Off-Peak
              </th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-xs text-right">
                Comparison
              </th>
            </tr>
          </thead>
          <tbody>
            {planResults.map((r, i) => {
              const isSelected = r.plan.id === selectedPlanId;
              const savings = selectedNetCost - r.netCost;

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
                  {hasExportCredits ? (
                    <>
                      <td className="px-4 py-4 text-right">{formatCurrency(r.totalCost)}</td>
                      <td className="px-4 py-4 text-right text-green-600">
                        -{formatCurrency(r.exportCredit)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(r.netCost)}
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-4 text-right font-semibold">
                      {formatCurrency(r.totalCost)}
                    </td>
                  )}
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
