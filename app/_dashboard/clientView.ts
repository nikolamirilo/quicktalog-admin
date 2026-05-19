import type {
  Bucket,
  CataloguePoint,
  DashboardData,
  DashboardView,
  Pageview,
  Ranking,
  RangeKey,
  UserPoint,
} from "./types"

const pad = (n: number) => String(n).padStart(2, "0")

const dayKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  })
}

const dayLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`)
  return d.toLocaleString("en-US", { month: "short", day: "numeric" })
}

const titleCase = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

const bucketise = (
  rows: { key: string | null | undefined }[],
  prettify?: (k: string) => string,
): Bucket[] => {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const k = (r.key ?? "-").toString().trim() || "-"
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name: prettify ? prettify(name) : name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

const enumerateDays = (start: Date, end: Date): string[] => {
  const out: string[] = []
  const cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  )
  const last = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  )
  while (cur.getTime() <= last) {
    out.push(dayKey(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

const enumerateMonths = (start: Date, end: Date): string[] => {
  const out: string[] = []
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)
  while (cur.getTime() <= last) {
    out.push(monthKey(cur))
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return out
}

export function resolveRange(
  rangeKey: RangeKey,
  customStart: string,
  customEnd: string,
  data: DashboardData,
): { start: string; end: string } {
  const todayISO = new Date().toISOString().slice(0, 10)
  if (rangeKey === "CUSTOM") {
    return { start: customStart || todayISO, end: customEnd || todayISO }
  }
  if (rangeKey === "ALL") {
    let earliest = Date.now()
    for (const u of data.users) {
      if (u.created_at) {
        const t = new Date(u.created_at).getTime()
        if (t < earliest) earliest = t
      }
    }
    for (const c of data.catalogues) {
      const t = new Date(c.created_at).getTime()
      if (t < earliest) earliest = t
    }
    return {
      start: new Date(earliest).toISOString().slice(0, 10),
      end: todayISO,
    }
  }
  const months = ({ "3M": 3, "6M": 6, "12M": 12 } as const)[rangeKey]
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - months)
  return { start: d.toISOString().slice(0, 10), end: todayISO }
}

export function computeView(
  data: DashboardData,
  startISO: string,
  endISO: string,
): DashboardView {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T23:59:59.999Z`)
  const startMs = start.getTime()
  const endMs = end.getTime()

  const inUserRange = (ts: string | null): boolean => {
    if (!ts) return false
    const t = new Date(ts).getTime()
    return t >= startMs && t <= endMs
  }

  const usersInRange = data.users.filter((u) => inUserRange(u.created_at))
  const cataloguesInRange = data.catalogues.filter((c) =>
    inUserRange(c.created_at),
  )
  const analyticsInRange = data.analytics.filter(
    (a) => a.date >= startISO && a.date <= endISO,
  )

  // Totals — scoped to the selected range
  const totalPv = analyticsInRange.reduce(
    (s, a) => s + (a.pageview_count ?? 0),
    0,
  )
  const totalUv = analyticsInRange.reduce(
    (s, a) => s + (a.unique_visitors ?? 0),
    0,
  )
  const activeUsers = new Set(analyticsInRange.map((a) => a.user_id)).size

  const totals = {
    users: usersInRange.length,
    catalogues: cataloguesInRange.length,
    pageviews: totalPv,
    uniqueVisitors: totalUv,
    activeUsers,
    avgCataloguesPerUser: usersInRange.length
      ? Number((cataloguesInRange.length / usersInRange.length).toFixed(2))
      : 0,
  }

  // Bucket size: daily for short ranges (≤90 days), monthly otherwise.
  const dayMs = 24 * 60 * 60 * 1000
  const spanDays = Math.floor((endMs - startMs) / dayMs) + 1
  const useDaily = spanDays <= 90

  let usersMonthly: UserPoint[]
  let usersCumulative: UserPoint[]
  let catsMonthly: CataloguePoint[]
  let catsCumulative: CataloguePoint[]
  let pageviewsSeries: Pageview[]

  if (useDaily) {
    const days = enumerateDays(start, end)
    const usersByDay = new Map<string, number>(days.map((d) => [d, 0]))
    const catsByDay = new Map<string, number>(days.map((d) => [d, 0]))
    const pvByDay = new Map<string, { pv: number; uv: number }>(
      days.map((d) => [d, { pv: 0, uv: 0 }]),
    )

    for (const u of usersInRange) {
      const k = u.created_at!.slice(0, 10)
      if (usersByDay.has(k)) usersByDay.set(k, usersByDay.get(k)! + 1)
    }
    for (const c of cataloguesInRange) {
      const k = c.created_at.slice(0, 10)
      if (catsByDay.has(k)) catsByDay.set(k, catsByDay.get(k)! + 1)
    }
    for (const a of analyticsInRange) {
      const k = a.date.slice(0, 10)
      const b = pvByDay.get(k)
      if (!b) continue
      b.pv += a.pageview_count ?? 0
      b.uv += a.unique_visitors ?? 0
    }

    usersMonthly = days.map((k) => ({
      date: dayLabel(k),
      Users: usersByDay.get(k) ?? 0,
    }))
    catsMonthly = days.map((k) => ({
      date: dayLabel(k),
      Catalogues: catsByDay.get(k) ?? 0,
    }))
    let ru = 0
    usersCumulative = days.map((k) => ({
      date: dayLabel(k),
      Users: (ru += usersByDay.get(k) ?? 0),
    }))
    let rc = 0
    catsCumulative = days.map((k) => ({
      date: dayLabel(k),
      Catalogues: (rc += catsByDay.get(k) ?? 0),
    }))
    pageviewsSeries = days.map((k) => {
      const b = pvByDay.get(k)!
      return { date: dayLabel(k), Pageviews: b.pv, "Unique visitors": b.uv }
    })
  } else {
    const months = enumerateMonths(start, end)
    const usersByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    const catsByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    const pvByMonth = new Map<string, { pv: number; uv: number }>(
      months.map((m) => [m, { pv: 0, uv: 0 }]),
    )

    for (const u of usersInRange) {
      const k = u.created_at!.slice(0, 7)
      if (usersByMonth.has(k)) usersByMonth.set(k, usersByMonth.get(k)! + 1)
    }
    for (const c of cataloguesInRange) {
      const k = c.created_at.slice(0, 7)
      if (catsByMonth.has(k)) catsByMonth.set(k, catsByMonth.get(k)! + 1)
    }
    for (const a of analyticsInRange) {
      const k = a.date.slice(0, 7)
      const b = pvByMonth.get(k)
      if (!b) continue
      b.pv += a.pageview_count ?? 0
      b.uv += a.unique_visitors ?? 0
    }

    usersMonthly = months.map((k) => ({
      date: monthLabel(k),
      Users: usersByMonth.get(k) ?? 0,
    }))
    catsMonthly = months.map((k) => ({
      date: monthLabel(k),
      Catalogues: catsByMonth.get(k) ?? 0,
    }))
    let ru = 0
    usersCumulative = months.map((k) => ({
      date: monthLabel(k),
      Users: (ru += usersByMonth.get(k) ?? 0),
    }))
    let rc = 0
    catsCumulative = months.map((k) => ({
      date: monthLabel(k),
      Catalogues: (rc += catsByMonth.get(k) ?? 0),
    }))
    pageviewsSeries = months.map((k) => {
      const b = pvByMonth.get(k)!
      return { date: monthLabel(k), Pageviews: b.pv, "Unique visitors": b.uv }
    })
  }

  // Catalogue breakdowns — only catalogues created in the selected range.
  const byStatus = bucketise(
    cataloguesInRange.map((c) => ({ key: c.status })),
    titleCase,
  )
  const bySource = bucketise(
    cataloguesInRange.map((c) => ({ key: c.source })),
    titleCase,
  )
  const byLanguage = bucketise(
    cataloguesInRange.map((c) => ({ key: c.language?.toUpperCase() ?? null })),
  )
  const byBusinessType = bucketise(
    cataloguesInRange.map((c) => ({ key: c.business_type })),
    titleCase,
  ).slice(0, 8)

  // Users by plan — only users created in the selected range.
  const planNameById = new Map(data.plans.map((p) => [p.id, p.name]))
  const planCounts = new Map<string, number>()
  for (const u of usersInRange) {
    const name = u.plan_id
      ? (planNameById.get(u.plan_id) ?? "Unknown")
      : "None"
    planCounts.set(name, (planCounts.get(name) ?? 0) + 1)
  }
  const planByUsers: Bucket[] = Array.from(planCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)

  // Top catalogues by pageviews — pageviews summed inside the range.
  // Match URLs against all known catalogues (not just ones created in range),
  // so a catalogue created earlier still surfaces when it's getting traffic.
  const pvByUrl = new Map<string, number>()
  for (const a of analyticsInRange) {
    pvByUrl.set(
      a.current_url,
      (pvByUrl.get(a.current_url) ?? 0) + (a.pageview_count ?? 0),
    )
  }
  const cataloguesByLen = [...data.catalogues].sort(
    (a, b) => b.name.length - a.name.length,
  )
  const catalogueViews = new Map<string, number>()
  for (const [url, pv] of pvByUrl) {
    const lower = url.toLowerCase()
    for (const c of cataloguesByLen) {
      if (!c.name) continue
      if (lower.includes(c.name.toLowerCase())) {
        catalogueViews.set(c.name, (catalogueViews.get(c.name) ?? 0) + pv)
        break
      }
    }
  }
  const topCataloguesByPageviews: Ranking[] = Array.from(
    catalogueViews.entries(),
  )
    .map(([name, value]) => ({ id: name, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Top creators by catalogues created in range.
  const userById = new Map(data.users.map((u) => [u.id, u]))
  const cataloguesByUser = new Map<string, number>()
  for (const c of cataloguesInRange) {
    cataloguesByUser.set(
      c.created_by,
      (cataloguesByUser.get(c.created_by) ?? 0) + 1,
    )
  }
  const topUsersByCatalogues: Ranking[] = Array.from(cataloguesByUser.entries())
    .map(([id, count]) => {
      const u = userById.get(id)
      const label = u?.name?.trim() || u?.email || id.slice(0, 8)
      return {
        id,
        name: label,
        value: count,
        meta: u?.email && u?.name ? u.email : undefined,
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return {
    totals,
    growth: {
      users: { monthly: usersMonthly, cumulative: usersCumulative },
      catalogues: { monthly: catsMonthly, cumulative: catsCumulative },
    },
    pageviewsSeries,
    catalogues: { byStatus, bySource, byLanguage, byBusinessType },
    plans: { byUsers: planByUsers },
    topCataloguesByPageviews,
    topUsersByCatalogues,
  }
}
