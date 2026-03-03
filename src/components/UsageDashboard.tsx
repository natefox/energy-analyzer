"use client";

import type { AnalysisResult, IntervalRecord, RatePlan, UtilityPlugin } from "@/lib/types";
import RateScheduleDisplay from "./RateScheduleDisplay";
import UsageSummary from "./UsageSummary";
import PlanComparisonTable from "./PlanComparisonTable";
import UsageAdvice from "./UsageAdvice";
import DailyUsageChart from "./charts/DailyUsageChart";
import DailyCostChart from "./charts/DailyCostChart";
import HourlyDistributionChart from "./charts/HourlyDistributionChart";

interface Props {
  result: AnalysisResult;
  plugin: UtilityPlugin;
  selectedPlan: RatePlan;
  records: IntervalRecord[];
}

export default function UsageDashboard({ result, plugin, selectedPlan, records }: Props) {
  const hasMidPeak = result.dailyData.some((d) => (d.midPeakUsage || 0) > 0);
  const hasSolar = result.totalGeneration > 0;

  return (
    <div className="space-y-6">
      <RateScheduleDisplay plan={selectedPlan} />
      <DailyUsageChart data={result.dailyData} hasMidPeak={hasMidPeak} hasSolar={hasSolar} />
      <DailyCostChart data={result.dailyData} hasMidPeak={hasMidPeak} />
      <HourlyDistributionChart
        weekdayProfile={result.hourlyProfile.weekday}
        weekendProfile={result.hourlyProfile.weekend}
      />
      <UsageSummary result={result} hasSolar={hasSolar} />
      <PlanComparisonTable
        records={records}
        plugin={plugin}
        selectedPlanId={selectedPlan.id}
      />
      <UsageAdvice
        result={result}
        records={records}
        plugin={plugin}
        selectedPlan={selectedPlan}
      />
    </div>
  );
}
