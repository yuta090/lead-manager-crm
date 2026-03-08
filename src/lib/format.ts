/** Format ISO date string to YYYY/MM/DD (JST) */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Tokyo",
    })
  } catch {
    return ""
  }
}

/** Format ISO date string to YYYY-MM-DD (JST, for date inputs) */
export function toLocalDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).replace(/\//g, "-")
}

/** Add days to a date and return YYYY-MM-DD string (JST) */
export function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toLocalDateString(d)
}

/** App version constant */
export const APP_VERSION = "2.0.0"
