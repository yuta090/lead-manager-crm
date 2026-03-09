"use client"

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { EmptyState } from "@/components/empty-state"
import { STATUS_ORDER, STATUS_CONFIG } from "@/types/database"

const statusChartConfig: ChartConfig = {
  count: {
    label: "企業数",
    color: "#3B82F6",
  },
}

export default function StatusChart({
  statusCounts,
}: {
  statusCounts: Record<string, number>
}) {
  const data = STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0).map(
    (s) => ({
      name: s,
      count: statusCounts[s] ?? 0,
      fill: STATUS_CONFIG[s].color,
    })
  )

  if (data.length === 0) {
    return <EmptyState title="データがありません" />
  }

  return (
    <ChartContainer config={statusChartConfig} className="h-[300px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={80} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
