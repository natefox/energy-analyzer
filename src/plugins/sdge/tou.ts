import type { Season } from "@/lib/types";

export function getSeason(month: number): Season {
  return month >= 6 && month <= 10 ? "summer" : "winter";
}

export function classifyInterval(date: Date, hour: number): string {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (hour >= 16 && hour < 21) return "peak";
  if (isWeekend) {
    if (hour < 14) return "superOffPeak";
    return "offPeak";
  }
  if (hour < 6) return "superOffPeak";
  return "offPeak";
}
