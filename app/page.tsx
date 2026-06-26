import { cookies } from "next/headers"

import { createClient } from "@/utils/supabase/server"

import Dashboard from "./_dashboard/Dashboard"
import { aggregate } from "./_dashboard/aggregate"

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [
    usersRes,
    cataloguesRes,
    analyticsRes,
    plansRes,
    subscriptionsRes,
    promptsRes,
    ocrRes,
    qrConfigsRes,
    newsletterRes,
    productNewsletterRes,
  ] = await Promise.all([
    supabase.from("users").select("id, email, name, created_at, plan_id, customer_id"),
    supabase
      .from("catalogues")
      .select(
        "id, name, status, source, language, business_type, created_by, created_at, updated_at, content, logo, contact, appearance, partners, tags",
      ),
    supabase
      .from("analytics")
      .select("date, current_url, pageview_count, unique_visitors, user_id"),
    supabase.from("plans").select("id, name"),
    supabase
      .from("subscriptions")
      .select(
        "subscription_id, subscription_status, price_id, scheduled_change, customer_id, created_at",
      ),
    supabase.from("prompts").select("user_id, catalogue, datetime"),
    supabase.from("ocr").select("user_id, catalogue, datetime"),
    supabase.from("qr_configs").select("catalogue, created_at"),
    supabase.from("newsletter").select("owner_id, catalogue_id, created_at"),
    supabase.from("product_newsletter").select("id"),
  ])

  const data = aggregate({
    users: usersRes.data ?? [],
    catalogues: cataloguesRes.data ?? [],
    analytics: analyticsRes.data ?? [],
    plans: plansRes.data ?? [],
    subscriptions: subscriptionsRes.data ?? [],
    prompts: promptsRes.data ?? [],
    ocr: ocrRes.data ?? [],
    qrConfigs: qrConfigsRes.data ?? [],
    newsletter: newsletterRes.data ?? [],
    productNewsletter: productNewsletterRes.data ?? [],
  })

  return <Dashboard data={data} />
}
