import type {
  AnalyticsRow,
  CatalogueRow,
  DashboardData,
  FeatureEventRow,
  NewsletterRow,
  PlanRow,
  QrConfigRow,
  SubscriptionRow,
  UserRow,
} from "./types"

// Raw catalogue row as it comes back from Supabase, before the heavy JSONB
// columns are reduced to compact scalars for the client.
type RawCatalogue = {
  id: string
  name: string
  status: string | null
  source: string | null
  language: string | null
  business_type: string | null
  created_by: string
  created_at: string
  updated_at: string | null
  content: unknown
  logo: unknown
  contact: unknown
  appearance: unknown
  partners: unknown
  tags: unknown
}

const isNonEmptyObject = (o: unknown): boolean =>
  !!o && typeof o === "object" && !Array.isArray(o) &&
  Object.keys(o as Record<string, unknown>).length > 0

const isNonEmptyArray = (a: unknown): boolean =>
  Array.isArray(a) && a.length > 0

const hasLogo = (logo: unknown): boolean =>
  typeof logo === "string" &&
  logo.trim() !== "" &&
  logo.trim().toUpperCase() !== "NULL"

// `content` is a JSONB array of sections; each section may carry one or more
// nested arrays of items/products. We count sections (top-level length) and
// items (sum of any nested array lengths) defensively, without assuming exact
// key names.
const deriveContent = (content: unknown): { sections: number; items: number } => {
  if (!Array.isArray(content)) return { sections: 0, items: 0 }
  let items = 0
  for (const section of content) {
    if (section && typeof section === "object" && !Array.isArray(section)) {
      for (const v of Object.values(section as Record<string, unknown>)) {
        if (Array.isArray(v)) items += v.length
      }
    }
  }
  return { sections: content.length, items }
}

const shapeCatalogue = (c: RawCatalogue): CatalogueRow => {
  const { sections, items } = deriveContent(c.content)
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    source: c.source,
    language: c.language,
    business_type: c.business_type,
    created_by: c.created_by,
    created_at: c.created_at,
    updated_at: c.updated_at,
    contentSections: sections,
    contentItems: items,
    hasLogo: hasLogo(c.logo),
    hasContact: isNonEmptyObject(c.contact),
    hasAppearance: isNonEmptyObject(c.appearance),
    hasPartners: isNonEmptyArray(c.partners),
    tagCount: Array.isArray(c.tags) ? c.tags.length : 0,
  }
}

export function aggregate(raw: {
  users: UserRow[]
  catalogues: RawCatalogue[]
  analytics: AnalyticsRow[]
  plans?: PlanRow[]
  subscriptions?: SubscriptionRow[]
  prompts?: FeatureEventRow[]
  ocr?: FeatureEventRow[]
  qrConfigs?: QrConfigRow[]
  newsletter?: NewsletterRow[]
  productNewsletter?: unknown[]
}): DashboardData {
  return {
    users: raw.users,
    catalogues: (raw.catalogues ?? []).map(shapeCatalogue),
    analytics: raw.analytics,
    plans: raw.plans ?? [],
    subscriptions: raw.subscriptions ?? [],
    prompts: raw.prompts ?? [],
    ocr: raw.ocr ?? [],
    qrConfigs: raw.qrConfigs ?? [],
    newsletter: raw.newsletter ?? [],
    productNewsletterCount: (raw.productNewsletter ?? []).length,
  }
}
