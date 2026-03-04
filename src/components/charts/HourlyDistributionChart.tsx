"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatKwh } from "@/lib/utils";

interface Props {
  weekdayProfile: number[];
  weekendProfile: number[];
}

export default function HourlyDistributionChart({ weekdayProfile, weekendProfile }: Props) {
  const data = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i === 0 ? 12 : i > 12 ? i - 12 : i}${i < 12 ? "am" : "pm"}`,
    weekday: weekdayProfile[i],
    weekend: weekendProfile[i],
  }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Average Hourly Usage Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(2)}`}
            label={{
              value: "Avg kWh",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip
            formatter={(value, name) => [
              formatKwh(Number(value)),
              name === "weekday" ? "Weekday Avg" : "Weekend Avg",
            ]}
          />
          <Legend />
          <Bar dataKey="weekday" name="Weekday" fill="#3b82f6" />
          <Bar dataKey="weekend" name="Weekend" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
