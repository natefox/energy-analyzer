"use client";

import type { RatePlan } from "@/lib/types";

interface Props {
  plan: RatePlan;
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function formatHourRange(ranges: { start: number; end: number }[]): string {
  if (ranges.length === 0) return "";
  return ranges.map((r) => `${formatHour(r.start)}-${formatHour(r.end)}`).join(", ");
}

function SeasonCard({
  label,
  monthRange,
  periods,
  baselineCredit,
  variant,
}: {
  label: string;
  monthRange: string;
  periods: [string, { rate: number; fees?: number; label: string; hours: { weekday: { start: number; end: number }[]; weekend: { start: number; end: number }[] } }][];
  baselineCredit?: number;
  variant: "summer" | "winter";
}) {
  const borderColor = variant === "summer" ? "border-amber-300" : "border-blue-200";
  const bgColor = variant === "summer" ? "bg-amber-50" : "bg-blue-50";
  const titleColor = variant === "summer" ? "text-amber-700" : "text-blue-700";
  const subtitleColor = variant === "summer" ? "text-amber-500" : "text-blue-500";
  const rateColor = variant === "summer" ? "text-amber-600" : "text-blue-600";
  const hourColor = variant === "summer" ? "text-amber-500" : "text-blue-500";

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-5`}>
      <h4 className={`text-lg font-bold ${titleColor}`}>{label}</h4>
      <p className={`text-sm ${subtitleColor} mb-4`}>{monthRange}</p>
      <div className="space-y-3">
        {periods.map(([key, period]) => {
          const totalRate = period.rate + (period.fees || 0);
          const weekdayHours = formatHourRange(period.hours.weekday);
          const weekendHours = formatHourRange(period.hours.weekend);

          return (
            <div key={key} className="bg-white rounded-lg border p-4">
              <p className="font-semibold text-gray-800">{period.label}</p>
              <p className={`text-2xl font-bold ${rateColor}`}>
                ${totalRate.toFixed(2)}
                <span className="text-sm font-normal text-gray-500">/kWh</span>
              </p>
              {baselineCredit && (
                <p className="text-xs text-green-600">
                  ${(totalRate - baselineCredit).toFixed(2)}/kWh after ${baselineCredit.toFixed(2)} baseline credit
                </p>
              )}
              {(weekdayHours || weekendHours) && (
                <div className={`text-xs ${hourColor} mt-1 space-y-0.5`}>
                  {weekdayHours && <p>Weekdays: {weekdayHours}</p>}
                  {weekendHours && <p>Weekends: {weekendHours}</p>}
                  {weekdayHours && weekendHours && weekdayHours === weekendHours && null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthRangeLabel(months: number[]): string {
  if (months.length === 0) return "";
  const sorted = [...months].sort((a, b) => a - b);
  return `${MONTH_NAMES[sorted[0] - 1]} through ${MONTH_NAMES[sorted[sorted.length - 1] - 1]}`;
}

export default function RateScheduleDisplay({ plan }: Props) {
  const summerPeriods = Object.entries(plan.seasons.summer.periods);
  const winterPeriods = Object.entries(plan.seasons.winter.periods);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <p className="text-sm text-gray-500">{plan.description}</p>
        {plan.eligibility && (
          <p className="text-xs text-amber-600 mt-1">{plan.eligibility}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SeasonCard
          label="Summer Rates"
          monthRange={monthRangeLabel(plan.seasons.summer.months)}
          periods={summerPeriods}
          baselineCredit={plan.baselineCredit}
          variant="summer"
        />
        <SeasonCard
          label="Winter Rates"
          monthRange={monthRangeLabel(plan.seasons.winter.months)}
          periods={winterPeriods}
          baselineCredit={plan.baselineCredit}
          variant="winter"
        />
      </div>
    </div>
  );
}
