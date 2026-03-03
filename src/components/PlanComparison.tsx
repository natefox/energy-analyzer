"use client";

import { useState, useMemo } from "react";
import type { UtilityPlugin, Season } from "@/lib/types";
import { calculatePlanComparison } from "@/lib/calculator";
import { formatCurrency } from "@/lib/utils";
import PlanCard from "./PlanCard";

interface Props { plugin: UtilityPlugin; }

export default function PlanComparison({ plugin }: Props) {
  const [monthlyKwh, setMonthlyKwh] = useState(500);
  const [peakPercent, setPeakPercent] = useState(25);
  const [season, setSeason] = useState<Season>("summer");
  const [leftPlanId, setLeftPlanId] = useState(plugin.plans[0]?.id || "");
  const [rightPlanId, setRightPlanId] = useState(plugin.plans[1]?.id || plugin.plans[0]?.id || "");

  const leftPlan = plugin.plans.find((p) => p.id === leftPlanId);
  const rightPlan = plugin.plans.find((p) => p.id === rightPlanId);

  const leftCost = useMemo(() => leftPlan ? calculatePlanComparison(leftPlan, monthlyKwh, peakPercent, season) : 0, [leftPlan, monthlyKwh, peakPercent, season]);
  const rightCost = useMemo(() => rightPlan ? calculatePlanComparison(rightPlan, monthlyKwh, peakPercent, season) : 0, [rightPlan, monthlyKwh, peakPercent, season]);

  const savings = Math.abs(leftCost - rightCost);
  const cheaperSide = leftCost < rightCost ? "left" : "right";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Usage (kWh)</label>
            <input type="number" value={monthlyKwh} onChange={(e) => setMonthlyKwh(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peak Usage: {peakPercent}%</label>
            <input type="range" value={peakPercent} onChange={(e) => setPeakPercent(Number(e.target.value))} min={0} max={100} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
            <select value={season} onChange={(e) => setSeason(e.target.value as Season)} className="w-full border rounded-lg px-3 py-2">
              <option value="summer">Summer</option>
              <option value="winter">Winter</option>
            </select>
          </div>
        </div>
      </div>
      {savings > 5 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <span className="text-green-700 font-medium">{cheaperSide === "left" ? leftPlan?.name : rightPlan?.name} saves you {formatCurrency(savings)}/month</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <select value={leftPlanId} onChange={(e) => setLeftPlanId(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3">
            {plugin.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {leftPlan && <PlanCard plan={leftPlan} season={season} monthlyCost={leftCost} />}
        </div>
        <div>
          <select value={rightPlanId} onChange={(e) => setRightPlanId(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3">
            {plugin.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {rightPlan && <PlanCard plan={rightPlan} season={season} monthlyCost={rightCost} />}
        </div>
      </div>
    </div>
  );
}
