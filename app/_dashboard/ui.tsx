"use client"

import { Card } from "@/components/charts"
import type { Ranking } from "./types"

// ── Formatters ──────────────────────────────────────────────────────────────

const intl = new Intl.NumberFormat("en-US")
const compact = new Intl.NumberFormat("en-US", { notation: "compact" })
const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export const number = (n: number) => intl.format(n)
export const compactNumber = (n: number) => compact.format(n)
export const decimal = (n: number) => n.toFixed(2)
export const pct = (n: number) => `${n}%`
export const money = (n: number) => moneyFmt.format(n)

export const toRanking = (rows: { name: string; value: number }[]): Ranking[] =>
  rows.map((b) => ({ id: b.name, name: b.name, value: b.value }))

// ── Palettes ────────────────────────────────────────────────────────────────

export type DonutColor =
  | "blue"
  | "emerald"
  | "violet"
  | "amber"
  | "gray"
  | "cyan"
  | "pink"
  | "lime"
  | "fuchsia"

export const CATALOGUE_STATUS_COLORS: DonutColor[] = [
  "blue",
  "amber",
  "emerald",
  "gray",
  "violet",
]

export const PLAN_COLORS: DonutColor[] = [
  "blue",
  "violet",
  "emerald",
  "amber",
  "cyan",
  "pink",
  "lime",
  "gray",
]

const SWATCH: Record<string, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
  pink: "bg-pink-500",
  lime: "bg-lime-500",
  fuchsia: "bg-fuchsia-500",
  gray: "bg-gray-500",
}

// ── Building blocks ─────────────────────────────────────────────────────────

export type Accent =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "cyan"
  | "pink"
  | "gray"

export function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: Accent
}) {
  const dot = {
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    cyan: "bg-cyan-500",
    pink: "bg-pink-500",
    gray: "bg-gray-500",
  }[accent ?? "blue"]
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden />
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
          {label}
        </p>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </Card>
  )
}

export function KpiInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 px-2.5 py-1.5 dark:bg-gray-800/60">
      <p className="text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-50">
        {value}
      </p>
    </div>
  )
}

export function SectionHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  )
}

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <Card className="flex flex-1 flex-col">{children}</Card>
    </div>
  )
}

export function Empty({ label = "No data in this range." }: { label?: string }) {
  return (
    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
      {label}
    </p>
  )
}

export function RankingList({
  rows,
  valueLabel,
  colorClass = "bg-blue-500",
  format = number,
}: {
  rows: Ranking[]
  valueLabel: string
  colorClass?: string
  format?: (n: number) => string
}) {
  if (rows.length === 0) {
    return <Empty label="No data yet." />
  }
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      <li className="flex items-baseline justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Name</span>
        <span>{valueLabel}</span>
      </li>
      {rows.map((r) => {
        const width = (r.value / max) * 100
        return (
          <li key={r.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-gray-800 dark:text-gray-200">
                {r.name}
                {r.meta && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">
                    {r.meta}
                  </span>
                )}
              </span>
              <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-50">
                {format(r.value)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full ${colorClass}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function DonutLegend({
  data,
  colors,
}: {
  data: { name: string; value: number }[]
  colors: string[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {data.map((d, i) => {
        const share = total ? ((d.value / total) * 100).toFixed(1) : "0.0"
        const swatch = SWATCH[colors[i % colors.length]] ?? "bg-gray-500"
        return (
          <li key={d.name} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${swatch}`} aria-hidden />
            <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
              {d.name}
            </span>
            <span className="tabular-nums text-gray-900 dark:text-gray-50">
              {number(d.value)}
            </span>
            <span className="w-10 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {share}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
