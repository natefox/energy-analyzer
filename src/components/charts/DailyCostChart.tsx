"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts";
import type { DailyData } from "@/lib/types";
import { formatDate, formatCurrency, periodColor } from "@/lib/utils";

interface Props {
  data: DailyData[];
  hasMidPeak?: boolean;
}

export default function DailyCostChart({ data, hasMidPeak }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Daily Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            label={{
              value: "Cost ($)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value) => [formatCurrency(Number(value)), String(value)]}
          />
          <Legend />
          <Bar dataKey="peakCost" name="Peak" stackId="cost" fill={periodColor("peak")} />
          {hasMidPeak && (
            <Bar
              dataKey="midPeakCost"
              name="Mid-Peak"
              stackId="cost"
              fill={periodColor("midPeak")}
            />
          )}
          <Bar dataKey="offPeakCost" name="Off-Peak" stackId="cost" fill={periodColor("offPeak")} />
          <Bar
            dataKey="superOffPeakCost"
            name="Super Off-Peak"
            stackId="cost"
            fill={periodColor("superOffPeak")}
          />
          {data.length > 30 && (
            <Brush dataKey="date" height={30} stroke="#8884d8" tickFormatter={formatDate} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
