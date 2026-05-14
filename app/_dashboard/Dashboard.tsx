"use client"

import { useMemo, useState } from "react"

import {
  AreaChart,
  BarChart,
  Card,
  DonutChart,
  LineChart,
} from "@/components/charts"
import { cx } from "@/lib/utils/cx"

import { computeCustomGrowth } from "./clientGrowth"
import type { DashboardData, GrowthRangeKey, Ranking } from "./types"
import Header from "@/components/Header"
import AuthGuard from "@/components/AuthGuard"

const intl = new Intl.NumberFormat("en-US")
const compact = new Intl.NumberFormat("en-US", { notation: "compact" })

const number = (n: number) => intl.format(n)
const compactNumber = (n: number) => compact.format(n)
const decimal = (n: number) => n.toFixed(2)

type RangeKey = GrowthRangeKey | "CUSTOM"

const RANGES: RangeKey[] = ["3M", "6M", "12M", "ALL", "CUSTOM"]
const RANGE_LABEL: Record<RangeKey, string> = {
  "3M": "3M",
  "6M": "6M",
  "12M": "12M",
  ALL: "All",
  CUSTOM: "Custom",
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const today = () => isoDay(new Date())
const monthsAgo = (n: number) => {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - n)
  return isoDay(d)
}

function RangeSelector({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (v: RangeKey) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cx(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === r
              ? "bg-gray-900 text-white shadow-sm dark:bg-gray-50 dark:text-gray-900"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
          )}
        >
          {RANGE_LABEL[r]}
        </button>
      ))}
    </div>
  )
}

function DatePicker({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
}) {
  const max = today()
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        From
        <input
          type="date"
          value={start}
          max={end || max}
          onChange={(e) => onStart(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-900 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-700"
        />
      </label>
      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        To
        <input
          type="date"
          value={end}
          min={start}
          max={max}
          onChange={(e) => onEnd(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-900 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-700"
        />
      </label>
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: "blue" | "violet" | "emerald" | "amber"
}) {
  const dot = {
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
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

function RankingList({
  rows,
  valueLabel,
  colorClass = "bg-blue-500",
}: {
  rows: Ranking[]
  valueLabel: string
  colorClass?: string
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No data yet.
      </p>
    )
  }
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      <li className="flex items-baseline justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Name</span>
        <span>{valueLabel}</span>
      </li>
      {rows.map((r) => {
        const pct = (r.value / max) * 100
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
                {number(r.value)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full ${colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const palette = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-lime-500",
  "bg-fuchsia-500",
  "bg-gray-500",
]

function DonutLegend({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {data.map((d, i) => {
        const pct = total ? ((d.value / total) * 100).toFixed(1) : "0.0"
        return (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${palette[i % palette.length]}`}
              aria-hidden
            />
            <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
              {d.name}
            </span>
            <span className="tabular-nums text-gray-900 dark:text-gray-50">
              {number(d.value)}
            </span>
            <span className="w-10 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {pct}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function Dashboard({ data }: { data: DashboardData }) {
  const [range, setRange] = useState<RangeKey>("12M")
  const [customStart, setCustomStart] = useState<string>(monthsAgo(6))
  const [customEnd, setCustomEnd] = useState<string>(today())
  const { totals, growth, pageviewsDaily, catalogues, raw } = data

  const current = useMemo(() => {
    if (range === "CUSTOM") {
      return computeCustomGrowth(
        raw.userCreatedAt,
        raw.catalogueCreatedAt,
        customStart,
        customEnd,
      )
    }
    return growth[range]
  }, [range, customStart, customEnd, growth, raw])

  const animationKey =
    range === "CUSTOM" ? `custom-${customStart}-${customEnd}` : range

  return (
    <AuthGuard>
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* KPI row */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Total users"
            value={number(totals.users)}
            hint={`${number(totals.activeUsers)} active (have traffic)`}
            accent="blue"
          />
          <KpiCard
            label="Total catalogues"
            value={number(totals.catalogues)}
            hint={`${decimal(totals.avgCataloguesPerUser)} avg per user`}
            accent="violet"
          />
          <KpiCard
            label="Total pageviews"
            value={compactNumber(totals.pageviews)}
            hint={`${compactNumber(totals.uniqueVisitors)} unique visitors`}
            accent="emerald"
          />
          <KpiCard
            label="Avg catalogues / user"
            value={decimal(totals.avgCataloguesPerUser)}
            hint="catalogues/users"
            accent="amber"
          />
        </section>

        {/* Growth - split into separate Users and Catalogues charts, with range selector */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Growth trends
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cumulative totals over the selected period
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {range === "CUSTOM" && (
                <DatePicker
                  start={customStart}
                  end={customEnd}
                  onStart={setCustomStart}
                  onEnd={setCustomEnd}
                />
              )}
              <RangeSelector value={range} onChange={setRange} />
            </div>
          </div>

          <div
            key={animationKey}
            className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            <Card>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Users
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                    {number(
                      current.users.cumulative[
                        current.users.cumulative.length - 1
                      ]?.Users ?? 0,
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Cumulative
                </span>
              </div>
              <AreaChart
                data={current.users.cumulative}
                index="date"
                categories={["Users"]}
                colors={["blue"]}
                valueFormatter={number}
                showLegend={false}
                yAxisWidth={48}
                className="h-64"
              />
            </Card>

            <Card>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Catalogues
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                    {number(
                      current.catalogues.cumulative[
                        current.catalogues.cumulative.length - 1
                      ]?.Catalogues ?? 0,
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  Cumulative
                </span>
              </div>
              <AreaChart
                data={current.catalogues.cumulative}
                index="date"
                categories={["Catalogues"]}
                colors={["violet"]}
                valueFormatter={number}
                showLegend={false}
                yAxisWidth={48}
                className="h-64"
              />
            </Card>
          </div>

          <div
            key={`${animationKey}-monthly`}
            className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            <Card>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                New users per month
              </p>
              <BarChart
                data={current.users.monthly}
                index="date"
                categories={["Users"]}
                colors={["blue"]}
                showLegend={false}
                valueFormatter={number}
                yAxisWidth={40}
                className="h-52"
              />
            </Card>
            <Card>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                New catalogues per month
              </p>
              <BarChart
                data={current.catalogues.monthly}
                index="date"
                categories={["Catalogues"]}
                colors={["violet"]}
                showLegend={false}
                valueFormatter={number}
                yAxisWidth={40}
                className="h-52"
              />
            </Card>
          </div>
        </section>

        {/* Pageviews timeline (full width) */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pageviews - last 30 days
          </h2>
          <Card>
            <LineChart
              data={pageviewsDaily}
              index="date"
              categories={["Pageviews", "Unique visitors"]}
              colors={["emerald", "cyan"]}
              valueFormatter={number}
              yAxisWidth={48}
              startEndOnly
              className="h-64"
            />
          </Card>
        </section>

        {/* Distribution - status donut, source bar, language bar - heights aligned */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Catalogues by status
            </h2>
            <Card className="flex flex-1 flex-col">
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={catalogues.byStatus}
                    category="name"
                    value="value"
                    colors={["blue", "amber", "emerald", "gray", "violet"]}
                    valueFormatter={number}
                    className="h-44 w-44"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total
                    </p>
                    <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                      {number(totals.catalogues)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <DonutLegend data={catalogues.byStatus} />
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Catalogues by source
            </h2>
            <Card className="flex flex-1 flex-col">
              <BarChart
                data={catalogues.bySource}
                index="name"
                categories={["value"]}
                colors={["violet"]}
                showLegend={false}
                valueFormatter={number}
                yAxisWidth={40}
                className="h-full min-h-64 flex-1"
              />
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Catalogues by language
            </h2>
            <Card className="flex flex-1 flex-col">
              <BarChart
                data={catalogues.byLanguage}
                index="name"
                categories={["value"]}
                colors={["cyan"]}
                layout="vertical"
                showLegend={false}
                valueFormatter={number}
                yAxisWidth={56}
                className="h-full min-h-64 flex-1"
              />
            </Card>
          </div>
        </section>

        {/* Rankings - reordered so business type is no longer directly below status */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Top catalogues by pageviews
            </h2>
            <Card className="flex flex-1 flex-col">
              <RankingList
                rows={data.topCataloguesByPageviews}
                valueLabel="Pageviews"
                colorClass="bg-emerald-500"
              />
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Top creators by catalogue count
            </h2>
            <Card className="flex flex-1 flex-col">
              <RankingList
                rows={data.topUsersByCatalogues}
                valueLabel="Catalogues"
                colorClass="bg-blue-500"
              />
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Catalogues by business type
            </h2>
            <Card className="flex flex-1 flex-col">
              {catalogues.byBusinessType.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No data yet.
                </p>
              ) : (
                <RankingList
                  rows={catalogues.byBusinessType.map((b) => ({
                    id: b.name,
                    name: b.name,
                    value: b.value,
                  }))}
                  valueLabel="Catalogues"
                  colorClass="bg-pink-500"
                />
              )}
            </Card>
          </div>
        </section>
      </div>
    </main>
    </AuthGuard>
  )
}
