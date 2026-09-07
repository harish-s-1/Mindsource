// Small formatting helpers used across screens.
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyWhole(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatDeadline(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, HH:mm");
  } catch {
    return iso;
  }
}

export function formatClock(iso: string): string {
  try {
    return format(parseISO(iso), "HH:mm:ss");
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  try {
    return `${formatDistanceToNowStrict(parseISO(iso))} ago`;
  } catch {
    return iso;
  }
}

export function formatDuration(hours: number): string {
  if (hours <= 0) return "Continuous";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem === 0 ? `${days}d` : `${days}d ${rem}h`;
}
