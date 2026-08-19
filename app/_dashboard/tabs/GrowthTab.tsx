"use client"

import { AreaChart, BarChart, Card } from "@/components/charts"

import type { DashboardView } from "../types"
import {
  KpiCard,
  SectionHeading,
  compactNumber,
  decimal,
  number,
} from "../ui"

// Platform-wide volume over time: how many users and catalogues arrived, and
// how much traffic the whole platform served.
export default function GrowthTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { totals, growth, pageviewsSeries } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Growth"
        subtitle="Totals and trends for the selected period"
      />

      <section
        key={`${animationKey}-kpi`}
        className="animate-chart-in grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="New users"
          value={number(totals.users)}
          hint={`${number(totals.activeUsers)} active (have traffic)`}
          accent="blue"
        />
        <KpiCard
          label="New catalogues"
          value={number(totals.catalogues)}
          hint={`${decimal(totals.avgCataloguesPerUser)} avg per new user`}
          accent="violet"
        />
        <KpiCard
          label="Pageviews"
          value={compactNumber(totals.pageviews)}
          hint={`${compactNumber(totals.uniqueVisitors)} unique visitors`}
          accent="emerald"
        />
        <KpiCard
          label="Catalogues / user"
          value={decimal(totals.avgCataloguesPerUser)}
          hint="in selected period"
          accent="amber"
        />
      </section>

      <SectionHeading
        title="Growth trends"
        subtitle="Cumulative totals reset to 0 at the start of the selected period"
      />

      <section
        key={animationKey}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Users
              </p>
              <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                {number(
                  growth.users.cumulative[growth.users.cumulative.length - 1]
                    ?.Users ?? 0,
                )}
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Cumulative
            </span>
          </div>
          <AreaChart
            data={growth.users.cumulative}
            index="date"
            categories={["Users"]}
            colors={["blue"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={56}
            startEndOnly
            className="h-64"
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Catalogues
              </p>
              <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                {number(
                  growth.catalogues.cumulative[
                    growth.catalogues.cumulative.length - 1
                  ]?.Catalogues ?? 0,
                )}
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              Cumulative
            </span>
          </div>
          <AreaChart
            data={growth.catalogues.cumulative}
            index="date"
            categories={["Catalogues"]}
            colors={["violet"]}
            valueFormatter={number}
            showLegend={false}
            yAxisWidth={56}
            startEndOnly
            className="h-64"
          />
        </Card>
      </section>

      <section
        key={`${animationKey}-bars`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card>
          <p className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">
            New users
          </p>
          <BarChart
            data={growth.users.monthly}
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
          <p className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-300">
            New catalogues
          </p>
          <BarChart
            data={growth.catalogues.monthly}
            index="date"
            categories={["Catalogues"]}
            colors={["violet"]}
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={40}
            className="h-52"
          />
        </Card>
      </section>

      <SectionHeading
        title="Pageviews"
        subtitle="Platform-wide traffic over the selected period"
      />
      <Card>
        <AreaChart
          key={animationKey}
          data={pageviewsSeries}
          index="date"
          categories={["Pageviews", "Unique visitors"]}
          colors={["emerald", "cyan"]}
          valueFormatter={number}
          yAxisWidth={56}
          startEndOnly
          className="animate-chart-in h-64"
        />
      </Card>
    </div>
  )
}
