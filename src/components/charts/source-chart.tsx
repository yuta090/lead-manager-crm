"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { EmptyState } from "@/components/empty-state"

const sourceChartConfig: ChartConfig = {
  count: {
    label: "企業数",
    color: "#10B981",
  },
}

export default function SourceChart({
  sourceCounts,
}: {
  sourceCounts: Record<string, number>
}) {
  const data = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  if (data.length === 0) {
    return <EmptyState title="データがありません" />
  }

  return (
    <ChartContainer config={sourceChartConfig} className="h-[300px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={100} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
