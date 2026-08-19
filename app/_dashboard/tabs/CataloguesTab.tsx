"use client"

import { BarChart, DonutChart } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  CATALOGUE_STATUS_COLORS,
  ChartCard,
  DonutLegend,
  Empty,
  KpiCard,
  RankingList,
  SectionHeading,
  number,
  pct,
} from "../ui"

// The catalogue itself: how it was made, what shape it is in, and whether it
// is still being maintained.
export default function CataloguesTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const {
    totals,
    catalogues,
    content,
    freshness,
    engagement,
    topCataloguesByPageviews,
  } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Catalogues"
        subtitle="Composition, content depth and freshness of the catalogues in this period"
      />

      <section
        key={`${animationKey}-cat-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="New catalogues"
          value={number(totals.catalogues)}
          hint="created in the selected period"
          accent="violet"
        />
        <KpiCard
          label="Published (all time)"
          value={number(engagement.publishedCatalogues)}
          hint={`${number(engagement.cataloguesWithTraffic)} received traffic`}
          accent="emerald"
        />
        <KpiCard
          label="Avg content"
          value={`${content.avgSections} / ${content.avgItems}`}
          hint="sections / items per catalogue"
          accent="cyan"
        />
        <KpiCard
          label="Stale catalogues"
          value={pct(freshness.pctStale)}
          hint="published, untouched for >90 days"
          accent="amber"
        />
      </section>

      <section
        key={`${animationKey}-dist`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Catalogues by status">
          {catalogues.byStatus.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <div className="relative h-44 w-44">
                  <DonutChart
                    data={catalogues.byStatus}
                    category="name"
                    value="value"
                    colors={CATALOGUE_STATUS_COLORS}
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
                <DonutLegend
                  data={catalogues.byStatus}
                  colors={CATALOGUE_STATUS_COLORS}
                />
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Catalogues by source">
          {catalogues.bySource.length === 0 ? (
            <Empty />
          ) : (
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
          )}
        </ChartCard>

        <ChartCard title="Catalogues by language">
          {catalogues.byLanguage.length === 0 ? (
            <Empty />
          ) : (
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
          )}
        </ChartCard>
      </section>

      <section
        key={`${animationKey}-cat-quality`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard
          title="Content completeness"
          subtitle={`% of new catalogues · avg ${content.avgSections} sections, ${content.avgItems} items`}
        >
          <BarChart
            data={content.completeness}
            index="name"
            categories={["value"]}
            colors={["cyan"]}
            layout="vertical"
            showLegend={false}
            valueFormatter={pct}
            yAxisWidth={88}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>

        <ChartCard
          title="Catalogue freshness"
          subtitle={`${pct(freshness.pctEdited)} edited after creation${
            freshness.medianDaysSinceEdit != null
              ? ` · median ${freshness.medianDaysSinceEdit}d since edit`
              : ""
          }`}
        >
          <BarChart
            data={freshness.recencyBuckets}
            index="name"
            categories={["value"]}
            colors={["amber"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={44}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>

        <ChartCard title="Catalogues by business type">
          {catalogues.byBusinessType.length === 0 ? (
            <Empty />
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
        </ChartCard>
      </section>

      <section key={`${animationKey}-cat-top`} className="animate-chart-in">
        <ChartCard
          title="Top catalogues by pageviews"
          subtitle="Across all catalogues receiving traffic in the selected period"
        >
          <RankingList
            rows={topCataloguesByPageviews}
            valueLabel="Pageviews"
            colorClass="bg-emerald-500"
          />
        </ChartCard>
      </section>
    </div>
  )
}
