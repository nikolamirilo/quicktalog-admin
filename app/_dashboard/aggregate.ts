import type {
  Bucket,
  CataloguePoint,
  DashboardData,
  GrowthSeries,
  Pageview,
  Ranking,
  UserPoint,
} from "./types"

type UserRow = {
  id: string
  email: string | null
  name: string | null
  created_at: string | null
}

type CatalogueRow = {
  id: string
  name: string
  status: string | null
  source: string | null
  language: string | null
  business_type: string | null
  created_by: string
  created_at: string
}

type AnalyticsRow = {
  date: string
  current_url: string
  pageview_count: number
  unique_visitors: number | null
  user_id: string
}

const monthKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  })
}

const dayKey = (iso: string) => iso.slice(0, 10)
const dayLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`)
  return d.toLocaleString("en-US", { month: "short", day: "numeric" })
}

const lastMonths = (count: number): string[] => {
  const out: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    )
  }
  return out
}

const fillDays = (count: number): string[] => {
  const out: string[] = []
  const today = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

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

const titleCase = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

function computeGrowthForMonths(
  monthKeys: string[],
  users: UserRow[],
  catalogues: CatalogueRow[],
): GrowthSeries {
  const usersByMonth = new Map<string, number>()
  const catsByMonth = new Map<string, number>()
  monthKeys.forEach((m) => {
    usersByMonth.set(m, 0)
    catsByMonth.set(m, 0)
  })

  for (const u of users) {
    if (!u.created_at) continue
    const k = monthKey(u.created_at)
    if (usersByMonth.has(k)) usersByMonth.set(k, usersByMonth.get(k)! + 1)
  }
  for (const c of catalogues) {
    const k = monthKey(c.created_at)
    if (catsByMonth.has(k)) catsByMonth.set(k, catsByMonth.get(k)! + 1)
  }

  const firstMonthStart = new Date(`${monthKeys[0]}-01T00:00:00Z`).getTime()
  const usersBefore = users.filter(
    (u) => u.created_at && new Date(u.created_at).getTime() < firstMonthStart,
  ).length
  const catsBefore = catalogues.filter(
    (c) => new Date(c.created_at).getTime() < firstMonthStart,
  ).length

  const usersMonthly: UserPoint[] = monthKeys.map((k) => ({
    date: monthLabel(k),
    Users: usersByMonth.get(k) ?? 0,
  }))
  const catsMonthly: CataloguePoint[] = monthKeys.map((k) => ({
    date: monthLabel(k),
    Catalogues: catsByMonth.get(k) ?? 0,
  }))

  let runU = usersBefore
  const usersCumulative: UserPoint[] = monthKeys.map((k) => {
    runU += usersByMonth.get(k) ?? 0
    return { date: monthLabel(k), Users: runU }
  })
  let runC = catsBefore
  const catsCumulative: CataloguePoint[] = monthKeys.map((k) => {
    runC += catsByMonth.get(k) ?? 0
    return { date: monthLabel(k), Catalogues: runC }
  })

  return {
    users: { monthly: usersMonthly, cumulative: usersCumulative },
    catalogues: { monthly: catsMonthly, cumulative: catsCumulative },
  }
}

function allTimeMonthKeys(
  users: UserRow[],
  catalogues: CatalogueRow[],
): string[] {
  const stamps: number[] = []
  for (const u of users)
    if (u.created_at) stamps.push(new Date(u.created_at).getTime())
  for (const c of catalogues) stamps.push(new Date(c.created_at).getTime())
  if (stamps.length === 0) return lastMonths(12)
  const start = new Date(Math.min(...stamps))
  const now = new Date()
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth()) +
    1
  return lastMonths(Math.max(1, months))
}

export function aggregate(
  users: UserRow[],
  catalogues: CatalogueRow[],
  analytics: AnalyticsRow[],
): DashboardData {
  const totalPageviews = analytics.reduce(
    (s, a) => s + (a.pageview_count ?? 0),
    0,
  )
  const totalUniqueVisitors = analytics.reduce(
    (s, a) => s + (a.unique_visitors ?? 0),
    0,
  )
  const activeUsers = new Set(analytics.map((a) => a.user_id)).size

  const growth = {
    "3M": computeGrowthForMonths(lastMonths(3), users, catalogues),
    "6M": computeGrowthForMonths(lastMonths(6), users, catalogues),
    "12M": computeGrowthForMonths(lastMonths(12), users, catalogues),
    ALL: computeGrowthForMonths(
      allTimeMonthKeys(users, catalogues),
      users,
      catalogues,
    ),
  }

  // Pageviews daily (last 30 days)
  const days = fillDays(30)
  const pvByDay = new Map<string, { pv: number; uv: number }>()
  days.forEach((d) => pvByDay.set(d, { pv: 0, uv: 0 }))
  for (const a of analytics) {
    const k = dayKey(a.date)
    const bucket = pvByDay.get(k)
    if (!bucket) continue
    bucket.pv += a.pageview_count ?? 0
    bucket.uv += a.unique_visitors ?? 0
  }
  const pageviewsDaily: Pageview[] = days.map((k) => ({
    date: dayLabel(k),
    Pageviews: pvByDay.get(k)!.pv,
    "Unique visitors": pvByDay.get(k)!.uv,
  }))

  // Catalogue breakdowns
  const byStatus = bucketise(
    catalogues.map((c) => ({ key: c.status })),
    titleCase,
  )
  const bySource = bucketise(
    catalogues.map((c) => ({ key: c.source })),
    titleCase,
  )
  const byLanguage = bucketise(
    catalogues.map((c) => ({ key: c.language?.toUpperCase() ?? null })),
  )
  const byBusinessType = bucketise(
    catalogues.map((c) => ({ key: c.business_type })),
    titleCase,
  ).slice(0, 8)

  // Top catalogues by pageviews
  const pvByUrl = new Map<string, number>()
  for (const a of analytics) {
    pvByUrl.set(
      a.current_url,
      (pvByUrl.get(a.current_url) ?? 0) + (a.pageview_count ?? 0),
    )
  }
  const cataloguesByLen = [...catalogues].sort(
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

  // Top users by catalogue count
  const cataloguesByUser = new Map<string, number>()
  for (const c of catalogues) {
    cataloguesByUser.set(
      c.created_by,
      (cataloguesByUser.get(c.created_by) ?? 0) + 1,
    )
  }
  const userById = new Map(users.map((u) => [u.id, u]))
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
    totals: {
      users: users.length,
      catalogues: catalogues.length,
      pageviews: totalPageviews,
      uniqueVisitors: totalUniqueVisitors,
      avgCataloguesPerUser: users.length
        ? Number((catalogues.length / users.length).toFixed(2))
        : 0,
      activeUsers,
    },
    growth,
    raw: {
      userCreatedAt: users
        .filter((u): u is UserRow & { created_at: string } => !!u.created_at)
        .map((u) => u.created_at),
      catalogueCreatedAt: catalogues.map((c) => c.created_at),
    },
    pageviewsDaily,
    catalogues: { byStatus, bySource, byLanguage, byBusinessType },
    topCataloguesByPageviews,
    topUsersByCatalogues,
  }
}
