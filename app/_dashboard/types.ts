export type UserPoint = { date: string; Users: number }
export type CataloguePoint = { date: string; Catalogues: number }

export type Pageview = {
  date: string
  Pageviews: number
  "Unique visitors": number
}
export type Bucket = { name: string; value: number }
export type Ranking = {
  id: string
  name: string
  value: number
  meta?: string
}

export type RangeKey = "1M" | "3M" | "6M" | "12M" | "ALL" | "CUSTOM"

export type UserRow = {
  id: string
  email: string | null
  name: string | null
  created_at: string | null
  plan_id: string | null
}

export type CatalogueRow = {
  id: string
  name: string
  status: string | null
  source: string | null
  language: string | null
  business_type: string | null
  created_by: string
  created_at: string
}

export type AnalyticsRow = {
  date: string
  current_url: string
  pageview_count: number
  unique_visitors: number | null
  user_id: string
}

export type PlanRow = {
  id: string
  name: string
}

export type DashboardData = {
  users: UserRow[]
  catalogues: CatalogueRow[]
  analytics: AnalyticsRow[]
  plans: PlanRow[]
}

export type GrowthSeries = {
  users: { monthly: UserPoint[]; cumulative: UserPoint[] }
  catalogues: { monthly: CataloguePoint[]; cumulative: CataloguePoint[] }
}

export type DashboardView = {
  totals: {
    users: number
    catalogues: number
    pageviews: number
    uniqueVisitors: number
    activeUsers: number
    avgCataloguesPerUser: number
  }
  growth: GrowthSeries
  pageviewsSeries: Pageview[]
  catalogues: {
    byStatus: Bucket[]
    bySource: Bucket[]
    byLanguage: Bucket[]
    byBusinessType: Bucket[]
  }
  plans: { byUsers: Bucket[] }
  topCataloguesByPageviews: Ranking[]
  topUsersByCatalogues: Ranking[]
}
