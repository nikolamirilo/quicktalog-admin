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
  customer_id: string | null
}

// Catalogue row delivered to the client. The heavy JSONB columns (content,
// appearance, contact, partners, tags) are reduced to compact scalars in
// `aggregate.ts` so the browser never receives the raw catalogue payload.
export type CatalogueRow = {
  id: string
  name: string
  status: string | null
  source: string | null
  language: string | null
  business_type: string | null
  created_by: string
  created_at: string
  updated_at: string | null
  contentSections: number
  contentItems: number
  hasLogo: boolean
  hasContact: boolean
  hasAppearance: boolean
  hasPartners: boolean
  tagCount: number
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

export type SubscriptionRow = {
  subscription_id: string
  subscription_status: string
  price_id: string | null
  scheduled_change: string | null
  customer_id: string
  created_at: string | null
}

// prompts + ocr share the same shape (an AI/feature usage event).
export type FeatureEventRow = {
  user_id: string | null
  catalogue: string
  datetime: string | null
}

export type QrConfigRow = {
  catalogue: string
  created_at: string | null
}

export type NewsletterRow = {
  owner_id: string
  catalogue_id: string | null
  created_at: string | null
}

export type DashboardData = {
  users: UserRow[]
  catalogues: CatalogueRow[]
  analytics: AnalyticsRow[]
  plans: PlanRow[]
  subscriptions: SubscriptionRow[]
  prompts: FeatureEventRow[]
  ocr: FeatureEventRow[]
  qrConfigs: QrConfigRow[]
  newsletter: NewsletterRow[]
  productNewsletterCount: number
}

export type GrowthSeries = {
  users: { monthly: UserPoint[]; cumulative: UserPoint[] }
  catalogues: { monthly: CataloguePoint[]; cumulative: CataloguePoint[] }
}

// ── New metric shapes ───────────────────────────────────────────────────────

export type Activation = {
  funnel: Bucket[] // Signed up → Created → Published → Got a visitor
  activationRate: number // % of users with ≥1 catalogue
  publishRate: number // % of catalogues that are published
  visitorRate: number // % of published catalogues that received a visit
  medianTtvDays: number | null // median days signup → first catalogue
  rateByCohort: { date: string; "Activation %": number }[]
}

export type Creators = {
  distribution: Bucket[] // 0 / 1 / 2–5 / 6+ catalogues per user
  ghostUsers: number
  ghostPct: number
  powerCreators: number // users with ≥6 catalogues
}

export type Engagement = {
  publishedCatalogues: number
  cataloguesWithTraffic: number
  deadPct: number // % of published catalogues with 0 views in range
  medianViews: number
  repeatRatio: number // pageviews / unique visitors
  viewsBuckets: Bucket[] // distribution of views per catalogue
  activeOverTime: { date: string; "Active catalogues": number }[]
  paretoTopShare: number // % of views captured by the top 10% of catalogues
}

export type ContentDepth = {
  avgSections: number
  avgItems: number
  completeness: Bucket[] // % of catalogues with logo / contact / appearance / partners / tags
}

export type Freshness = {
  pctEdited: number // % edited after creation
  pctStale: number // % of published catalogues not edited in >90 days
  medianDaysSinceEdit: number | null
  recencyBuckets: Bucket[] // <7d / 7–30d / 30–90d / >90d
}

export type Subscriptions = {
  statusMix: Bucket[]
  conversionFunnel: Bucket[] // All users → Subscribed → Trialing → Active
  paidConversionPct: number
  churnRate: number
  scheduledCancellations: number
  newOverTime: { date: string; "New subscriptions": number }[]
}

export type Revenue = {
  activePayers: number
  arpu: number | null // null until per-plan prices are available
  mrr: number | null
  arr: number | null
  byPlan: Bucket[] // active payers per plan (or revenue once priced)
  pricesConfigured: boolean
}

export type Features = {
  adoption: Bucket[] // usage volume per feature
  aiCataloguePct: number // % of catalogues created via AI source
  qrAdoptionPct: number // % of catalogues with a QR config
  usageOverTime: {
    date: string
    "AI generations": number
    "OCR scans": number
  }[]
}

// ── New-user insights (the "Insights" tab) ──────────────────────────────────
// Everything here is scoped to the cohort of users who signed up inside the
// selected period, plus the catalogues those users created in that period.

export type Insights = {
  newUsers: number
  activatedUsers: number // new users with >=1 catalogue
  activationRate: number
  cataloguesCreated: number // catalogues created in range by the new cohort
  cataloguesPerUser: number // the ratio
  publishedCatalogues: number
  publishRate: number
  totalViews: number // pageviews on catalogues owned by the new cohort
  uniqueVisitors: number
  viewsPerCatalogue: number
  viewsPerUser: number
  subscribedUsers: number
  paidConversionRate: number
  medianTtvDays: number | null
  overTime: {
    date: string
    "New users": number
    "New catalogues": number
  }[]
  ratioOverTime: { date: string; "Catalogues per user": number }[]
  byCategory: Bucket[] // business type
  bySource: Bucket[]
  byLanguage: Bucket[]
  byStatus: Bucket[]
  byPlan: Bucket[]
  viewsByCategory: Bucket[]
  viewsBySource: Bucket[]
  attributedViews: number // views matched to a specific catalogue
  topCreators: Ranking[]
  topCatalogues: Ranking[]
}

export type DashboardView = {
  insights: Insights
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
  activation: Activation
  creators: Creators
  engagement: Engagement
  content: ContentDepth
  freshness: Freshness
  subscriptions: Subscriptions
  revenue: Revenue
  features: Features
}
