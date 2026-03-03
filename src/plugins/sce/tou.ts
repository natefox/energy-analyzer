import type { Season } from "@/lib/types";

export function getSeason(month: number): Season {
  return month >= 6 && month <= 9 ? "summer" : "winter";
}

export function classifyInterval(date: Date, hour: number): string {
  const month = date.getMonth() + 1;
  const season = getSeason(month);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (season === "summer") {
    if (hour >= 16 && hour < 21) return isWeekend ? "midPeak" : "peak";
    return "offPeak";
  }
  // Winter
  if (hour >= 16 && hour < 21) return "midPeak";
  if (hour >= 8 && hour < 16) return "superOffPeak";
  return "offPeak";
}
