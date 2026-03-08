"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Mail,
  MessageSquare,
  Handshake,
  Trophy,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import { EmptyState } from "@/components/empty-state"
import { KpiCard, KpiGrid } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import type { Company, CompanyStatus, Genre } from "@/types/database"
import { STATUS_ORDER, STATUS_CONFIG } from "@/types/database"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stats = {
  total: number
  withEmail: number
  engaged: number
  negotiating: number
  closed: number
  statusCounts: Record<string, number>
  sourceCounts: Record<string, number>
}

type GenreSummary = {
  id: string
  name: string
  total: number
  engaged: number
  negotiating: number
  closed: number
}

// ---------------------------------------------------------------------------
// Chart configs
// ---------------------------------------------------------------------------

const statusChartConfig: ChartConfig = {
  count: {
    label: "企業数",
    color: "#3B82F6",
  },
}

const sourceChartConfig: ChartConfig = {
  count: {
    label: "企業数",
    color: "#10B981",
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStats(companies: Pick<Company, "status" | "email" | "source">[]): Stats {
  const statusCounts: Record<string, number> = {}
  const sourceCounts: Record<string, number> = {}

  for (const c of companies) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1
    const src = c.source || "不明"
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
  }

  return {
    total: companies.length,
    withEmail: companies.filter((c) => c.email).length,
    engaged: statusCounts["反応あり"] ?? 0,
    negotiating: statusCounts["商談中"] ?? 0,
    closed: statusCounts["成約"] ?? 0,
    statusCounts,
    sourceCounts,
  }
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function StatusChart({ statusCounts }: { statusCounts: Record<string, number> }) {
  const data = STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0).map(
    (s) => ({
      name: s,
      count: statusCounts[s] ?? 0,
      fill: STATUS_CONFIG[s].color,
    })
  )

  if (data.length === 0) {
    return (
      <EmptyState title="データがありません" />
    )
  }

  return (
    <ChartContainer config={statusChartConfig} className="h-[300px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={80} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

function SourceChart({ sourceCounts }: { sourceCounts: Record<string, number> }) {
  const data = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  if (data.length === 0) {
    return (
      <EmptyState title="データがありません" />
    )
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

// ---------------------------------------------------------------------------
// Cross-genre summary table
// ---------------------------------------------------------------------------

function GenreSummaryTable({ summaries }: { summaries: GenreSummary[] }) {
  if (summaries.length === 0) {
    return <EmptyState title="ジャンルがありません" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ジャンル別サマリー</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ジャンル</TableHead>
              <TableHead className="text-right">総企業数</TableHead>
              <TableHead className="text-right">反応あり</TableHead>
              <TableHead className="text-right">商談中</TableHead>
              <TableHead className="text-right">成約</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="text-right">{g.total}</TableCell>
                <TableCell className="text-right">{g.engaged}</TableCell>
                <TableCell className="text-right">{g.negotiating}</TableCell>
                <TableCell className="text-right">{g.closed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { currentGenre, genres, loading: genreLoading } = useGenre()
  const [stats, setStats] = useState<Stats | null>(null)
  const [genreSummaries, setGenreSummaries] = useState<GenreSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch stats for the current genre
  useEffect(() => {
    if (!currentGenre) return
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from("lm_companies")
        .select("status, email, source")
        .eq("genre_id", currentGenre.id)

      const companies = (data ?? []) as Pick<Company, "status" | "email" | "source">[]
      setStats(computeStats(companies))
      setLoading(false)
    })()
  }, [currentGenre])

  // Fetch cross-genre summary
  useEffect(() => {
    if (genres.length === 0) return
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase
        .from("lm_companies")
        .select("genre_id, status")

      const companies = (data ?? []) as { genre_id: string; status: CompanyStatus }[]

      const byGenre = new Map<string, { total: number; engaged: number; negotiating: number; closed: number }>()

      for (const c of companies) {
        const entry = byGenre.get(c.genre_id) ?? {
          total: 0,
          engaged: 0,
          negotiating: 0,
          closed: 0,
        }
        entry.total++
        if (c.status === "反応あり") entry.engaged++
        if (c.status === "商談中") entry.negotiating++
        if (c.status === "成約") entry.closed++
        byGenre.set(c.genre_id, entry)
      }

      const summaries: GenreSummary[] = genres.map((g) => {
        const entry = byGenre.get(g.id) ?? {
          total: 0,
          engaged: 0,
          negotiating: 0,
          closed: 0,
        }
        return { id: g.id, name: g.name, ...entry }
      })

      setGenreSummaries(summaries)
    })()
  }, [genres])

  if (genreLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">読み込み中...</div>
    )
  }

  if (!currentGenre) {
    return (
      <EmptyState
        title="ジャンルが登録されていません"
        description="「ジャンル管理」からジャンルを追加してください"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          {currentGenre.name} の詳細分析
        </p>
      </div>

      {/* KPI Cards */}
      {loading || !stats ? (
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <KpiGrid>
          <KpiCard
            label="総企業数"
            value={stats.total}
            color="#2563EB"
            icon={
              <Building2 className="h-5 w-5" style={{ color: "#2563EB" }} />
            }
          />
          <KpiCard
            label="メールあり"
            value={stats.withEmail}
            color="#0284C7"
            icon={<Mail className="h-5 w-5" style={{ color: "#0284C7" }} />}
          />
          <KpiCard
            label="反応あり"
            value={stats.engaged}
            color="#D97706"
            icon={
              <MessageSquare
                className="h-5 w-5"
                style={{ color: "#D97706" }}
              />
            }
          />
          <KpiCard
            label="商談中"
            value={stats.negotiating}
            color="#F97316"
            icon={
              <Handshake className="h-5 w-5" style={{ color: "#F97316" }} />
            }
          />
          <KpiCard
            label="成約"
            value={stats.closed}
            color="#059669"
            icon={<Trophy className="h-5 w-5" style={{ color: "#059669" }} />}
          />
        </KpiGrid>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>ステータス分布</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChart statusCounts={stats.statusCounts} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>データソース別</CardTitle>
            </CardHeader>
            <CardContent>
              <SourceChart sourceCounts={stats.sourceCounts} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cross-genre summary */}
      <GenreSummaryTable summaries={genreSummaries} />
    </div>
  )
}
