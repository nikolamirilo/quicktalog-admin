"use client"

import {
  AreaChart,
  BarChart,
  Card,
  DonutChart,
  LineChart,
} from "@/components/charts"

import {
  performanceData,
  planDistribution,
  revenueData,
  trafficData,
  usageData,
} from "./data"

const currency = (n: number) =>
  `$${Intl.NumberFormat("en-US", { notation: "compact" }).format(n)}`

const number = (n: number) => Intl.NumberFormat("en-US").format(n)

const ms = (n: number) => `${n} ms`

export default function ChartsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2">
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase dark:text-gray-400">
            Chart library
          </p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-50">
            Tremor charts
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reusable, Tailwind-native chart components built on Recharts.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Area chart - Revenue vs Expenses
          </h2>
          <Card>
            <AreaChart
              data={revenueData}
              index="date"
              categories={["Revenue", "Expenses"]}
              colors={["blue", "violet"]}
              valueFormatter={currency}
              yAxisWidth={56}
            />
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Stacked bar chart - Daily active users by plan
          </h2>
          <Card>
            <BarChart
              data={usageData}
              index="day"
              categories={["Free", "Pro", "Enterprise"]}
              colors={["gray", "blue", "emerald"]}
              type="stacked"
              valueFormatter={number}
              yAxisWidth={48}
            />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Line chart - P95 latency
            </h2>
            <Card>
              <LineChart
                data={performanceData}
                index="month"
                categories={["API p95", "DB p95", "Cache p95"]}
                colors={["fuchsia", "amber", "cyan"]}
                valueFormatter={ms}
                yAxisWidth={56}
              />
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Horizontal bar chart - Traffic sources
            </h2>
            <Card>
              <BarChart
                data={trafficData}
                index="source"
                categories={["visits"]}
                colors={["blue"]}
                layout="vertical"
                showLegend={false}
                valueFormatter={number}
                yAxisWidth={80}
              />
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Donut chart - Plan distribution
          </h2>
          <Card>
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-around">
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={planDistribution}
                  category="name"
                  value="users"
                  colors={["gray", "blue", "violet", "emerald"]}
                  valueFormatter={number}
                  showLabel
                  label={`${number(
                    planDistribution.reduce((s, p) => s + p.users, 0),
                  )} users`}
                  className="h-48 w-48"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Donut variant
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={planDistribution}
                  category="name"
                  value="users"
                  colors={["gray", "blue", "violet", "emerald"]}
                  valueFormatter={number}
                  variant="pie"
                  className="h-48 w-48"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pie variant
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {planDistribution.map((p, i) => {
                  const palette = [
                    "bg-gray-500",
                    "bg-blue-500",
                    "bg-violet-500",
                    "bg-emerald-500",
                  ]
                  return (
                    <li key={p.name} className="flex items-center gap-3">
                      <span
                        className={`size-2.5 rounded-full ${palette[i]}`}
                        aria-hidden
                      />
                      <span className="w-24 text-gray-700 dark:text-gray-300">
                        {p.name}
                      </span>
                      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-50">
                        {number(p.users)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Compact - Gradient area, no axes (KPI sparkline)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Monthly revenue
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                {currency(62400)}
              </p>
              <AreaChart
                data={revenueData}
                index="date"
                categories={["Revenue"]}
                colors={["emerald"]}
                showLegend={false}
                showXAxis={false}
                showYAxis={false}
                showGridLines={false}
                className="mt-3 h-20"
              />
            </Card>
            <Card className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Expenses
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                {currency(26100)}
              </p>
              <AreaChart
                data={revenueData}
                index="date"
                categories={["Expenses"]}
                colors={["amber"]}
                showLegend={false}
                showXAxis={false}
                showYAxis={false}
                showGridLines={false}
                className="mt-3 h-20"
              />
            </Card>
            <Card className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                API latency p95
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                {ms(102)}
              </p>
              <LineChart
                data={performanceData}
                index="month"
                categories={["API p95"]}
                colors={["fuchsia"]}
                showLegend={false}
                showXAxis={false}
                showYAxis={false}
                showGridLines={false}
                className="mt-3 h-20"
              />
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
