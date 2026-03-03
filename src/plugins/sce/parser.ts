import Papa from "papaparse";
import type { IntervalRecord } from "@/lib/types";

export function detectCsv(text: string): boolean {
  const lines = text.split("\n").slice(0, 20);
  return lines.some((line) =>
    line.includes("Energy Consumption time Period Start")
  );
}

function parseSceDateTime(datetimeStr: string): Date {
  const cleaned = datetimeStr.replace(/"/g, "").trim();
  const match = cleaned.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(AM|PM)$/i
  );
  if (!match) throw new Error(`Invalid SCE datetime: ${datetimeStr}`);
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  let hours = parseInt(match[4], 10);
  const minutes = parseInt(match[5], 10);
  const ampm = match[6].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(year, month - 1, day, hours, minutes);
}

export function parseCsv(text: string): IntervalRecord[] {
  const lines = text.split("\n");
  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (lines[i].includes("Energy Consumption time Period Start")) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1)
    throw new Error("Could not find SCE CSV header row");

  const csvContent = lines.slice(headerIndex).join("\n");
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const records: IntervalRecord[] = [];
  for (const row of parsed.data as Record<string, string>[]) {
    const startStr =
      row["Energy Consumption time Period Start"]?.trim();
    const endStr =
      row["Energy Consumption time Period End"]?.trim();
    const delivered = parseFloat(
      (row["Delivered"] || "0").replace(/"/g, "").trim()
    );
    const received = parseFloat(
      (row["Received"] || "0").replace(/"/g, "").trim()
    );
    if (!startStr || !endStr) continue;
    const startTime = parseSceDateTime(startStr);
    const endTime = parseSceDateTime(endStr);
    records.push({
      date: new Date(
        startTime.getFullYear(),
        startTime.getMonth(),
        startTime.getDate()
      ),
      startTime,
      endTime,
      consumption: delivered,
      generation: received,
      net: delivered - received,
    });
  }
  return records;
}
