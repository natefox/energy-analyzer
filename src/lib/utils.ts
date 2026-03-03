export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRate(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatKwh(value: number): string {
  return `${value.toFixed(1)} kWh`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function periodColor(period: string): string {
  switch (period) {
    case "peak":
      return "#ef4444";
    case "midPeak":
      return "#f97316";
    case "offPeak":
      return "#3b82f6";
    case "superOffPeak":
      return "#22c55e";
    default:
      return "#6b7280";
  }
}

export function periodLabel(period: string): string {
  switch (period) {
    case "peak":
      return "Peak";
    case "midPeak":
      return "Mid-Peak";
    case "offPeak":
      return "Off-Peak";
    case "superOffPeak":
      return "Super Off-Peak";
    default:
      return period;
  }
}
