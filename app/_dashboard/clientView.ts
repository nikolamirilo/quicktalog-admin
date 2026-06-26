import type {
  Bucket,
  CataloguePoint,
  DashboardData,
  DashboardView,
  Pageview,
  Ranking,
  RangeKey,
  SubscriptionRow,
  UserPoint,
} from "./types"

// ── Paddle price map (P3) ────────────────────────────────────────────────────
// Revenue $ figures (MRR/ARR/ARPU) require the monthly amount for each Paddle
// price_id. The database stores only the price_id, not the amount, so until a
// Paddle price sync lands this stays empty and revenue is reported as payer
// counts only. To enable $ figures, fill in: { "<price_id>": <monthly_amount> }.
// Annual prices should be entered as their monthly-equivalent (amount / 12).
const PRICE_BY_PRICE_ID: Record<string, number> = {}

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

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const round1 = (n: number) => Math.round(n * 10) / 10

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
  const months = ({ "1M": 1, "3M": 3, "6M": 6, "12M": 12 } as const)[rangeKey]
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

  // Shared period helpers for the new time series below.
  const periods = useDaily ? enumerateDays(start, end) : enumerateMonths(start, end)
  const periodKeyOf = (iso: string) =>
    useDaily ? iso.slice(0, 10) : iso.slice(0, 7)
  const periodLabel = useDaily ? dayLabel : monthLabel
  const isoInRange = (iso: string | null | undefined): boolean =>
    iso != null && iso.slice(0, 10) >= startISO && iso.slice(0, 10) <= endISO

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

  // Pageviews + unique visitors attributed to catalogues. Match URLs against
  // all known catalogues (not just ones created in range), longest name first,
  // so a catalogue created earlier still surfaces when it's getting traffic.
  const pvByUrl = new Map<string, number>()
  const uvByUrl = new Map<string, number>()
  for (const a of analyticsInRange) {
    pvByUrl.set(
      a.current_url,
      (pvByUrl.get(a.current_url) ?? 0) + (a.pageview_count ?? 0),
    )
    uvByUrl.set(
      a.current_url,
      (uvByUrl.get(a.current_url) ?? 0) + (a.unique_visitors ?? 0),
    )
  }
  const cataloguesByLen = [...data.catalogues].sort(
    (a, b) => b.name.length - a.name.length,
  )
  const catalogueViews = new Map<string, number>()
  const urlToCat = new Map<string, string>()
  for (const [url, pv] of pvByUrl) {
    const lower = url.toLowerCase()
    for (const c of cataloguesByLen) {
      if (!c.name) continue
      if (lower.includes(c.name.toLowerCase())) {
        catalogueViews.set(c.name, (catalogueViews.get(c.name) ?? 0) + pv)
        urlToCat.set(url, c.name)
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

  // ── Per-user catalogue facts (used by activation + creators) ──────────────
  const firstCatByUser = new Map<string, number>()
  const publishedByUser = new Set<string>()
  const catCountByUser = new Map<string, number>()
  const isPublished = (s: string | null) => (s ?? "").toLowerCase() === "published"
  for (const c of data.catalogues) {
    const t = new Date(c.created_at).getTime()
    const prev = firstCatByUser.get(c.created_by)
    if (prev === undefined || t < prev) firstCatByUser.set(c.created_by, t)
    if (isPublished(c.status)) publishedByUser.add(c.created_by)
    catCountByUser.set(c.created_by, (catCountByUser.get(c.created_by) ?? 0) + 1)
  }
  const ownersWithTraffic = new Set(analyticsInRange.map((a) => a.user_id))

  // 1. Activation funnel (over users who signed up in range, monotonic stages)
  const createdUsers = usersInRange.filter((u) => firstCatByUser.has(u.id))
  const publishedUsers = createdUsers.filter((u) => publishedByUser.has(u.id))
  const visitedUsers = publishedUsers.filter((u) => ownersWithTraffic.has(u.id))
  const publishedInRange = cataloguesInRange.filter((c) => isPublished(c.status))

  // 2. Activation rate over time + time-to-first-catalogue
  const ttv: number[] = []
  for (const u of usersInRange) {
    const f = firstCatByUser.get(u.id)
    if (f != null && u.created_at) {
      const d = (f - new Date(u.created_at).getTime()) / dayMs
      if (d >= 0) ttv.push(d)
    }
  }
  const cohortMonths = enumerateMonths(start, end)
  const cohortTotals = new Map<string, number>(cohortMonths.map((m) => [m, 0]))
  const cohortActive = new Map<string, number>(cohortMonths.map((m) => [m, 0]))
  for (const u of usersInRange) {
    if (!u.created_at) continue
    const k = u.created_at.slice(0, 7)
    if (!cohortTotals.has(k)) continue
    cohortTotals.set(k, cohortTotals.get(k)! + 1)
    if (firstCatByUser.has(u.id)) cohortActive.set(k, cohortActive.get(k)! + 1)
  }
  const activation = {
    funnel: [
      { name: "Signed up", value: usersInRange.length },
      { name: "Created catalogue", value: createdUsers.length },
      { name: "Published", value: publishedUsers.length },
      { name: "Got a visitor", value: visitedUsers.length },
    ],
    activationRate: usersInRange.length
      ? round1((createdUsers.length / usersInRange.length) * 100)
      : 0,
    publishRate: cataloguesInRange.length
      ? round1((publishedInRange.length / cataloguesInRange.length) * 100)
      : 0,
    visitorRate: publishedUsers.length
      ? round1((visitedUsers.length / publishedUsers.length) * 100)
      : 0,
    medianTtvDays: ttv.length ? round1(median(ttv)) : null,
    rateByCohort: cohortMonths.map((m) => {
      const tot = cohortTotals.get(m) ?? 0
      const act = cohortActive.get(m) ?? 0
      return {
        date: monthLabel(m),
        "Activation %": tot ? round1((act / tot) * 100) : 0,
      }
    }),
  }

  // 3. Creator distribution: ghost users vs power creators (snapshot)
  const ghostUsers = data.users.filter((u) => !catCountByUser.has(u.id)).length
  let creatorsOne = 0
  let creatorsMid = 0
  let creatorsPower = 0
  for (const [, n] of catCountByUser) {
    if (n === 1) creatorsOne++
    else if (n <= 5) creatorsMid++
    else creatorsPower++
  }
  const creators = {
    distribution: [
      { name: "0 (ghost)", value: ghostUsers },
      { name: "1", value: creatorsOne },
      { name: "2–5", value: creatorsMid },
      { name: "6+", value: creatorsPower },
    ],
    ghostUsers,
    ghostPct: data.users.length
      ? round1((ghostUsers / data.users.length) * 100)
      : 0,
    powerCreators: creatorsPower,
  }

  // 4 + 5. Engagement quality + active catalogues over time + Pareto
  const publishedCats = data.catalogues.filter((c) => isPublished(c.status))
  const publishedCount = publishedCats.length
  const pubViews: number[] = []
  let cataloguesWithTraffic = 0
  for (const c of publishedCats) {
    const pv = catalogueViews.get(c.name) ?? 0
    pubViews.push(pv)
    if (pv > 0) cataloguesWithTraffic++
  }
  const viewBucketDefs: { name: string; test: (v: number) => boolean }[] = [
    { name: "0", test: (v) => v === 0 },
    { name: "1–10", test: (v) => v >= 1 && v <= 10 },
    { name: "11–50", test: (v) => v >= 11 && v <= 50 },
    { name: "51–200", test: (v) => v >= 51 && v <= 200 },
    { name: "200+", test: (v) => v > 200 },
  ]
  const sortedViews = [...catalogueViews.values()].sort((a, b) => b - a)
  const totalCatPv = sortedViews.reduce((s, v) => s + v, 0)
  const paretoTopN = Math.max(1, Math.ceil(sortedViews.length * 0.1))
  const activeSets = new Map<string, Set<string>>(
    periods.map((p) => [p, new Set<string>()]),
  )
  for (const a of analyticsInRange) {
    if ((a.pageview_count ?? 0) <= 0) continue
    const name = urlToCat.get(a.current_url)
    if (!name) continue
    activeSets.get(periodKeyOf(a.date))?.add(name)
  }
  const engagement = {
    publishedCatalogues: publishedCount,
    cataloguesWithTraffic,
    deadPct: publishedCount
      ? round1(((publishedCount - cataloguesWithTraffic) / publishedCount) * 100)
      : 0,
    medianViews: Math.round(median(pubViews)),
    repeatRatio: totalUv ? round1(totalPv / totalUv) : 0,
    viewsBuckets: viewBucketDefs.map((d) => ({
      name: d.name,
      value: pubViews.filter(d.test).length,
    })),
    activeOverTime: periods.map((p) => ({
      date: periodLabel(p),
      "Active catalogues": activeSets.get(p)?.size ?? 0,
    })),
    paretoTopShare: totalCatPv
      ? round1(
          (sortedViews.slice(0, paretoTopN).reduce((s, v) => s + v, 0) /
            totalCatPv) *
            100,
        )
      : 0,
  }

  // 6. Content depth & completeness (catalogues created in range)
  const nCat = cataloguesInRange.length
  const pctOfCat = (k: number) => (nCat ? round1((k / nCat) * 100) : 0)
  const content = {
    avgSections: nCat
      ? round1(
          cataloguesInRange.reduce((s, c) => s + c.contentSections, 0) / nCat,
        )
      : 0,
    avgItems: nCat
      ? round1(cataloguesInRange.reduce((s, c) => s + c.contentItems, 0) / nCat)
      : 0,
    completeness: [
      { name: "Logo", value: pctOfCat(cataloguesInRange.filter((c) => c.hasLogo).length) },
      { name: "Contact", value: pctOfCat(cataloguesInRange.filter((c) => c.hasContact).length) },
      { name: "Appearance", value: pctOfCat(cataloguesInRange.filter((c) => c.hasAppearance).length) },
      { name: "Partners", value: pctOfCat(cataloguesInRange.filter((c) => c.hasPartners).length) },
      { name: "Tags", value: pctOfCat(cataloguesInRange.filter((c) => c.tagCount > 0).length) },
    ],
  }

  // 7. Freshness & stale rate (edited% in range; staleness over published)
  const editedThresholdMs = 60 * 1000
  const editedInRange = cataloguesInRange.filter(
    (c) =>
      c.updated_at &&
      new Date(c.updated_at).getTime() >
        new Date(c.created_at).getTime() + editedThresholdMs,
  ).length
  const daysSince: number[] = []
  const recency = { lt7: 0, lt30: 0, lt90: 0, gt90: 0 }
  let staleCount = 0
  for (const c of publishedCats) {
    const ref = c.updated_at ?? c.created_at
    if (!ref) continue
    const d = (endMs - new Date(ref).getTime()) / dayMs
    daysSince.push(d)
    if (d > 90) {
      staleCount++
      recency.gt90++
    } else if (d < 7) recency.lt7++
    else if (d < 30) recency.lt30++
    else recency.lt90++
  }
  const freshness = {
    pctEdited: nCat ? round1((editedInRange / nCat) * 100) : 0,
    pctStale: publishedCount ? round1((staleCount / publishedCount) * 100) : 0,
    medianDaysSinceEdit: daysSince.length ? Math.round(median(daysSince)) : null,
    recencyBuckets: [
      { name: "<7d", value: recency.lt7 },
      { name: "7–30d", value: recency.lt30 },
      { name: "30–90d", value: recency.lt90 },
      { name: ">90d", value: recency.gt90 },
    ],
  }

  // 8. Subscription health & conversion (status = current snapshot)
  const subs = data.subscriptions
  const isActiveSub = (s: SubscriptionRow) =>
    (s.subscription_status ?? "").toLowerCase() === "active"
  const isCanceledSub = (s: SubscriptionRow) =>
    /cancel/i.test(s.subscription_status ?? "")
  const subCustomers = new Set(subs.map((s) => s.customer_id))
  const activeCustomers = new Set(subs.filter(isActiveSub).map((s) => s.customer_id))
  const totalUsersAll = data.users.length
  const activeSubCount = subs.filter(isActiveSub).length
  const canceledSubCount = subs.filter(isCanceledSub).length
  const subByPeriod = new Map<string, number>(periods.map((p) => [p, 0]))
  for (const s of subs) {
    if (!isoInRange(s.created_at)) continue
    const k = periodKeyOf(s.created_at!)
    if (subByPeriod.has(k)) subByPeriod.set(k, subByPeriod.get(k)! + 1)
  }
  const subscriptions = {
    statusMix: bucketise(
      subs.map((s) => ({ key: s.subscription_status })),
      titleCase,
    ),
    conversionFunnel: [
      { name: "Signed up", value: totalUsersAll },
      { name: "Subscribed", value: subCustomers.size },
      { name: "Active paid", value: activeCustomers.size },
    ],
    paidConversionPct: totalUsersAll
      ? round1((activeCustomers.size / totalUsersAll) * 100)
      : 0,
    churnRate:
      activeSubCount + canceledSubCount
        ? round1((canceledSubCount / (activeSubCount + canceledSubCount)) * 100)
        : 0,
    scheduledCancellations: subs.filter(
      (s) => s.scheduled_change != null && String(s.scheduled_change).trim() !== "",
    ).length,
    newOverTime: periods.map((p) => ({
      date: periodLabel(p),
      "New subscriptions": subByPeriod.get(p) ?? 0,
    })),
  }

  // 9. Revenue (MRR/ARR/ARPU need Paddle prices — P3; else payer counts)
  const activeSubs = subs.filter(isActiveSub)
  const byPlanMap = new Map<string, number>()
  for (const s of activeSubs) {
    const name = s.price_id ? (planNameById.get(s.price_id) ?? "Unknown") : "Unknown"
    byPlanMap.set(name, (byPlanMap.get(name) ?? 0) + 1)
  }
  const pricesConfigured = Object.keys(PRICE_BY_PRICE_ID).length > 0
  const mrr = pricesConfigured
    ? activeSubs.reduce(
        (s, sub) => s + (sub.price_id ? (PRICE_BY_PRICE_ID[sub.price_id] ?? 0) : 0),
        0,
      )
    : null
  const activePayers = activeCustomers.size
  const revenue = {
    activePayers,
    mrr,
    arr: mrr != null ? mrr * 12 : null,
    arpu: mrr != null && activePayers ? Math.round((mrr / activePayers) * 100) / 100 : null,
    byPlan: Array.from(byPlanMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    pricesConfigured,
  }

  // 10. Feature adoption (AI / OCR / QR / lead capture)
  const qrCatalogues = new Set(data.qrConfigs.map((q) => q.catalogue)).size
  const aiCatalogues = data.catalogues.filter((c) =>
    (c.source ?? "").toLowerCase().includes("ai"),
  ).length
  const featByPeriod = new Map<string, { ai: number; ocr: number }>(
    periods.map((p) => [p, { ai: 0, ocr: 0 }]),
  )
  for (const p of data.prompts) {
    if (!isoInRange(p.datetime)) continue
    const b = featByPeriod.get(periodKeyOf(p.datetime!))
    if (b) b.ai++
  }
  for (const o of data.ocr) {
    if (!isoInRange(o.datetime)) continue
    const b = featByPeriod.get(periodKeyOf(o.datetime!))
    if (b) b.ocr++
  }
  const features = {
    adoption: [
      { name: "AI generations", value: data.prompts.length },
      { name: "OCR scans", value: data.ocr.length },
      { name: "QR configs", value: data.qrConfigs.length },
      { name: "Lead captures", value: data.newsletter.length },
      { name: "Marketing signups", value: data.productNewsletterCount },
    ],
    aiCataloguePct: data.catalogues.length
      ? round1((aiCatalogues / data.catalogues.length) * 100)
      : 0,
    qrAdoptionPct: data.catalogues.length
      ? round1((qrCatalogues / data.catalogues.length) * 100)
      : 0,
    usageOverTime: periods.map((p) => {
      const b = featByPeriod.get(p)!
      return {
        date: periodLabel(p),
        "AI generations": b.ai,
        "OCR scans": b.ocr,
      }
    }),
  }

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
    activation,
    creators,
    engagement,
    content,
    freshness,
    subscriptions,
    revenue,
    features,
  }
}
