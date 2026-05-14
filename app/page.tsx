import { cookies } from "next/headers"

import { createClient } from "@/utils/supabase/server"

import Dashboard from "./_dashboard/Dashboard"
import { aggregate } from "./_dashboard/aggregate"

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [usersRes, cataloguesRes, analyticsRes] = await Promise.all([
    supabase.from("users").select("id, email, name, created_at"),
    supabase
      .from("catalogues")
      .select(
        "id, name, status, source, language, business_type, created_by, created_at",
      ),
    supabase
      .from("analytics")
      .select("date, current_url, pageview_count, unique_visitors, user_id"),
  ])

  const data = aggregate(
    usersRes.data ?? [],
    cataloguesRes.data ?? [],
    analyticsRes.data ?? [],
  )

  return <Dashboard data={data} />
}
