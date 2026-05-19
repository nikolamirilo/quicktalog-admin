import type {
  AnalyticsRow,
  CatalogueRow,
  DashboardData,
  PlanRow,
  UserRow,
} from "./types"

export function aggregate(
  users: UserRow[],
  catalogues: CatalogueRow[],
  analytics: AnalyticsRow[],
  plans: PlanRow[] = [],
): DashboardData {
  return { users, catalogues, analytics, plans }
}
