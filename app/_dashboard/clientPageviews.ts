import type { AnalyticsDailyPoint, Pageview } from "./types"

const dayLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`)
  return d.toLocaleString("en-US", { month: "short", day: "numeric" })
}

const monthKeyOf = (iso: string) => iso.slice(0, 7)
const monthLabelOf = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  })
}

export function computePageviewsForRange(
  analyticsDaily: AnalyticsDailyPoint[],
  startISO: string,
  endISO: string,
): Pageview[] {
  if (!startISO || !endISO) return []
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
  if (start.getTime() > end.getTime()) return []

  const dayMs = 24 * 60 * 60 * 1000
  const spanDays =
    Math.floor((end.getTime() - start.getTime()) / dayMs) + 1

  const inRange = analyticsDaily.filter(
    (d) => d.date >= startISO && d.date <= endISO,
  )

  // Switch to monthly buckets once the range exceeds ~3 months so the
  // line chart stays readable.
  if (spanDays > 90) {
    const buckets = new Map<string, { pv: number; uv: number }>()
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
    while (cur.getTime() <= endMonth.getTime()) {
      buckets.set(
        `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`,
        { pv: 0, uv: 0 },
      )
      cur.setUTCMonth(cur.getUTCMonth() + 1)
    }
    for (const d of inRange) {
      const k = monthKeyOf(d.date)
      const b = buckets.get(k)
      if (!b) continue
      b.pv += d.pv
      b.uv += d.uv
    }
    return Array.from(buckets.entries()).map(([k, v]) => ({
      date: monthLabelOf(k),
      Pageviews: v.pv,
      "Unique visitors": v.uv,
    }))
  }

  const byDay = new Map(inRange.map((d) => [d.date, d]))
  const out: Pageview[] = []
  const cur = new Date(start)
  while (cur.getTime() <= end.getTime()) {
    const key = cur.toISOString().slice(0, 10)
    const entry = byDay.get(key)
    out.push({
      date: dayLabel(key),
      Pageviews: entry?.pv ?? 0,
      "Unique visitors": entry?.uv ?? 0,
    })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}
