"use client"

import { AreaChart, BarChart, Card, LineChart } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  ChartCard,
  KpiCard,
  RankingList,
  SectionHeading,
  number,
  pct,
  toRanking,
} from "../ui"

// Are signups reaching value, and are the catalogues they publish alive?
export default function EngagementTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { activation, creators, engagement, topUsersByCatalogues } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Activation & engagement"
        subtitle="Are signups reaching value, and are catalogues alive?"
      />

      <section
        key={`${animationKey}-act-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="Activation rate"
          value={pct(activation.activationRate)}
          hint="new users who created a catalogue"
          accent="blue"
        />
        <KpiCard
          label="Time to first catalogue"
          value={
            activation.medianTtvDays == null
              ? "—"
              : `${activation.medianTtvDays} d`
          }
          hint="median, signup → first catalogue"
          accent="violet"
        />
        <KpiCard
          label="Ghost users"
          value={number(creators.ghostUsers)}
          hint={`${pct(creators.ghostPct)} of all users · 0 catalogues`}
          accent="amber"
        />
        <KpiCard
          label="Dead catalogues"
          value={pct(engagement.deadPct)}
          hint="published, 0 views this period"
          accent="pink"
        />
      </section>

      <section
        key={`${animationKey}-act-funnel`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChartCard title="Activation funnel">
          <RankingList
            rows={toRanking(activation.funnel)}
            valueLabel="Users"
            colorClass="bg-blue-500"
          />
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {pct(activation.publishRate)} of new catalogues are published ·{" "}
            {pct(activation.visitorRate)} of publishers got a visitor
          </p>
        </ChartCard>
        <ChartCard title="Activation rate by signup cohort">
          <LineChart
            data={activation.rateByCohort}
            index="date"
            categories={["Activation %"]}
            colors={["blue"]}
            valueFormatter={pct}
            showLegend={false}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-act-dist`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Catalogues per user">
          <BarChart
            data={creators.distribution}
            index="name"
            categories={["value"]}
            colors={["violet"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
        <ChartCard title="Views per published catalogue">
          <BarChart
            data={engagement.viewsBuckets}
            index="name"
            categories={["value"]}
            colors={["emerald"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>
        <ChartCard title="Top creators" subtitle="By catalogue count in period">
          <RankingList
            rows={topUsersByCatalogues}
            valueLabel="Catalogues"
            colorClass="bg-blue-500"
          />
        </ChartCard>
      </section>

      <div key={`${animationKey}-act-active`} className="animate-chart-in">
        <Card>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Active catalogues over time
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Catalogues receiving ≥1 view per period
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Top 10% = {pct(engagement.paretoTopShare)} of views ·{" "}
              {engagement.repeatRatio}× views/visitor
            </span>
          </div>
          <AreaChart
            data={engagement.activeOverTime}
            index="date"
            categories={["Active catalogues"]}
            colors={["emerald"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={44}
            startEndOnly
            className="h-56"
          />
        </Card>
      </div>
    </div>
  )
}
