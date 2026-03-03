"use client";

import type { RatePlan } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props { plan: RatePlan; season: "summer" | "winter"; monthlyCost: number; }

export default function PlanCard({ plan, season, monthlyCost }: Props) {
  const seasonRates = plan.seasons[season];
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border flex-1">
      <h3 className="text-xl font-bold">{plan.name}</h3>
      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
      {plan.eligibility && <p className="text-xs text-amber-600 mt-1">{plan.eligibility}</p>}
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-gray-700 uppercase">{season} Rates</p>
        {Object.entries(seasonRates.periods).map(([key, period]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-gray-600">{period.label}</span>
            <span className="font-medium">
              ${period.rate.toFixed(2)}/kWh
              {plan.baselineCredit && <span className="text-green-600 text-xs ml-1">(-${plan.baselineCredit.toFixed(2)} credit)</span>}
            </span>
          </div>
        ))}
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-gray-600">Monthly Charge</span>
          <span className="font-medium">{formatCurrency(plan.monthlyCharge)}</span>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t">
        <p className="text-sm text-gray-500">Estimated Monthly Cost</p>
        <p className="text-3xl font-bold text-emerald-600">{formatCurrency(monthlyCost)}</p>
      </div>
    </div>
  );
}
