import type { CataloguePoint, GrowthSeries, UserPoint } from "./types"

const monthKeyOf = (iso: string) => {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

const monthLabelOf = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  })
}

const monthsBetween = (startISO: string, endISO: string): string[] => {
  if (!startISO || !endISO) return []
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
  const out: string[] = []
  const cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  )
  const endMonth = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1),
  )
  if (cur.getTime() > endMonth.getTime()) return []
  while (cur.getTime() <= endMonth.getTime()) {
    out.push(
      `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`,
    )
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return out
}

export function computeCustomGrowth(
  userCreatedAt: string[],
  catalogueCreatedAt: string[],
  startISO: string,
  endISO: string,
): GrowthSeries {
  const months = monthsBetween(startISO, endISO)
  if (months.length === 0) {
    return {
      users: { monthly: [], cumulative: [] },
      catalogues: { monthly: [], cumulative: [] },
    }
  }

  const usersByMonth = new Map<string, number>()
  const catsByMonth = new Map<string, number>()
  months.forEach((m) => {
    usersByMonth.set(m, 0)
    catsByMonth.set(m, 0)
  })

  // Filter by end of the last month so points after endISO month aren't counted
  const lastMonthEnd = (() => {
    const [y, m] = months[months.length - 1].split("-").map(Number)
    return Date.UTC(y, m, 1) // first day of NEXT month, exclusive
  })()

  for (const ts of userCreatedAt) {
    const t = new Date(ts).getTime()
    if (t >= lastMonthEnd) continue
    const k = monthKeyOf(ts)
    if (usersByMonth.has(k)) usersByMonth.set(k, usersByMonth.get(k)! + 1)
  }
  for (const ts of catalogueCreatedAt) {
    const t = new Date(ts).getTime()
    if (t >= lastMonthEnd) continue
    const k = monthKeyOf(ts)
    if (catsByMonth.has(k)) catsByMonth.set(k, catsByMonth.get(k)! + 1)
  }

  const firstMonthStart = new Date(`${months[0]}-01T00:00:00Z`).getTime()
  const usersBefore = userCreatedAt.filter(
    (ts) => new Date(ts).getTime() < firstMonthStart,
  ).length
  const catsBefore = catalogueCreatedAt.filter(
    (ts) => new Date(ts).getTime() < firstMonthStart,
  ).length

  const usersMonthly: UserPoint[] = months.map((k) => ({
    date: monthLabelOf(k),
    Users: usersByMonth.get(k) ?? 0,
  }))
  const catsMonthly: CataloguePoint[] = months.map((k) => ({
    date: monthLabelOf(k),
    Catalogues: catsByMonth.get(k) ?? 0,
  }))

  let runU = usersBefore
  const usersCumulative: UserPoint[] = months.map((k) => {
    runU += usersByMonth.get(k) ?? 0
    return { date: monthLabelOf(k), Users: runU }
  })
  let runC = catsBefore
  const catsCumulative: CataloguePoint[] = months.map((k) => {
    runC += catsByMonth.get(k) ?? 0
    return { date: monthLabelOf(k), Catalogues: runC }
  })

  return {
    users: { monthly: usersMonthly, cumulative: usersCumulative },
    catalogues: { monthly: catsMonthly, cumulative: catsCumulative },
  }
}
