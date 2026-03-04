import Papa from "papaparse";
import type { IntervalRecord } from "@/lib/types";

export function detectCsv(text: string): boolean {
  const lines = text.split("\n").slice(0, 20);
  return lines.some(
    (line) => line.includes("Meter Number") && line.includes("Date") && line.includes("Start Time")
  );
}

function parseTime(dateStr: string, timeStr: string): Date {
  const [month, day, year] = dateStr.split("/").map(Number);
  const timeParts = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeParts) throw new Error(`Invalid time: ${timeStr}`);
  let hours = parseInt(timeParts[1], 10);
  const minutes = parseInt(timeParts[2], 10);
  const ampm = timeParts[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(year, month - 1, day, hours, minutes);
}

export function parseCsv(text: string): IntervalRecord[] {
  const lines = text.split("\n");
  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (
      lines[i].includes("Meter Number") &&
      lines[i].includes("Date") &&
      lines[i].includes("Start Time")
    ) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) throw new Error("Could not find SDGE CSV header row");

  const csvContent = lines.slice(headerIndex).join("\n");
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const records: IntervalRecord[] = [];
  for (const row of parsed.data as Record<string, string>[]) {
    const date = row["Date"]?.trim();
    const startTimeStr = row["Start Time"]?.trim();
    const consumption = parseFloat(row["Consumption"]) || 0;
    const generation = parseFloat(row["Generation"]) || 0;
    const net = parseFloat(row["Net"]) || 0;
    if (!date || !startTimeStr) continue;
    const startTime = parseTime(date, startTimeStr);
    const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);
    records.push({
      date: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate()),
      startTime,
      endTime,
      consumption,
      generation,
      net,
    });
  }
  return records;
}
