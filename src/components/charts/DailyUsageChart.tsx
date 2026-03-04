"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from "recharts";
import type { DailyData } from "@/lib/types";
import { formatDate, formatKwh, periodColor } from "@/lib/utils";

interface Props {
  data: DailyData[];
  hasMidPeak?: boolean;
  hasSolar?: boolean;
}

export default function DailyUsageChart({ data, hasMidPeak, hasSolar }: Props) {
  // Transform data to add negative generation values for stacking below zero
  const chartData = hasSolar
    ? data.map((d) => ({
        ...d,
        solarGeneration: -d.totalGeneration,
      }))
    : data;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Daily Usage Breakdown</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(0)}`}
            label={{ value: "kWh", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
          />
          <Tooltip
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value, name) => {
              const absVal = Math.abs(Number(value));
              return [formatKwh(absVal), String(name)];
            }}
          />
          <Legend />
          <Bar dataKey="peakUsage" name="Peak" stackId="usage" fill={periodColor("peak")} />
          {hasMidPeak && (
            <Bar
              dataKey="midPeakUsage"
              name="Mid-Peak"
              stackId="usage"
              fill={periodColor("midPeak")}
            />
          )}
          <Bar
            dataKey="offPeakUsage"
            name="Off-Peak"
            stackId="usage"
            fill={periodColor("offPeak")}
          />
          <Bar
            dataKey="superOffPeakUsage"
            name="Super Off-Peak"
            stackId="usage"
            fill={periodColor("superOffPeak")}
          />
          {hasSolar && (
            <>
              <ReferenceLine y={0} stroke="#666" />
              <Bar
                dataKey="solarGeneration"
                name="Solar Generation"
                stackId="solar"
                fill="#eab308"
              />
            </>
          )}
          {data.length > 30 && (
            <Brush dataKey="date" height={30} stroke="#8884d8" tickFormatter={formatDate} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
