"use client"

import { BarChart, LineChart } from "@/components/charts"

import type { DashboardView } from "../types"
import { ChartCard, KpiInline, SectionHeading, number, pct } from "../ui"

// Which features earn their keep.
export default function FeaturesTab({
  view,
  animationKey,
}: {
  view: DashboardView
  animationKey: string
}) {
  const { features } = view

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Feature adoption"
        subtitle="Which features earn their keep? (adoption totals are all-time, the trend follows the selected period)"
      />

      <section
        key={`${animationKey}-feat`}
        className="animate-chart-in grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <ChartCard title="Adoption by feature">
          <div className="mb-3 flex flex-wrap gap-3">
            <KpiInline
              label="AI catalogues"
              value={pct(features.aiCataloguePct)}
            />
            <KpiInline label="QR adoption" value={pct(features.qrAdoptionPct)} />
          </div>
          <BarChart
            data={features.adoption}
            index="name"
            categories={["value"]}
            colors={["pink"]}
            layout="vertical"
            showLegend={false}
            valueFormatter={number}
            yAxisWidth={104}
            className="h-full min-h-56 flex-1"
          />
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="AI & OCR usage over time">
            <LineChart
              data={features.usageOverTime}
              index="date"
              categories={["AI generations", "OCR scans"]}
              colors={["violet", "cyan"]}
              valueFormatter={number}
              yAxisWidth={44}
              className="h-full min-h-56 flex-1"
            />
          </ChartCard>
        </div>
      </section>
    </div>
  )
}
