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

export type GrowthRangeKey = "3M" | "6M" | "12M" | "ALL"

export type GrowthSeries = {
  users: { monthly: UserPoint[]; cumulative: UserPoint[] }
  catalogues: { monthly: CataloguePoint[]; cumulative: CataloguePoint[] }
}

export type DashboardData = {
  totals: {
    users: number
    catalogues: number
    pageviews: number
    uniqueVisitors: number
    avgCataloguesPerUser: number
    activeUsers: number
  }
  growth: Record<GrowthRangeKey, GrowthSeries>
  raw: {
    userCreatedAt: string[]
    catalogueCreatedAt: string[]
  }
  pageviewsDaily: Pageview[]
  catalogues: {
    byStatus: Bucket[]
    bySource: Bucket[]
    byLanguage: Bucket[]
    byBusinessType: Bucket[]
  }
  topCataloguesByPageviews: Ranking[]
  topUsersByCatalogues: Ranking[]
}
