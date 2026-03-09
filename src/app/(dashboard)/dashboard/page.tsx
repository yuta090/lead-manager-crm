"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import {
  Building2,
  Mail,
  MessageSquare,
  Handshake,
  Trophy,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import { EmptyState } from "@/components/empty-state"
import { KpiCard, KpiGrid } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { STATUS_CONFIG } from "@/types/database"
import type { Company, CompanyStatus } from "@/types/database"

const StatusChart = dynamic(() => import("@/components/charts/status-chart"), {
  loading: () => <Skeleton className="h-[300px] rounded-lg" />,
  ssr: false,
})

const SourceChart = dynamic(() => import("@/components/charts/source-chart"), {
  loading: () => <Skeleton className="h-[300px] rounded-lg" />,
  ssr: false,
})

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
// Conversion Funnel
// ---------------------------------------------------------------------------

const FUNNEL_STEPS: { status: CompanyStatus; label: string; color: string }[] = [
  { status: "新規", label: "新規", color: "#3B82F6" },
  { status: "送信済", label: "送信済", color: "#8B5CF6" },
  { status: "反応あり", label: "反応あり", color: "#EAB308" },
  { status: "商談中", label: "商談中", color: "#F97316" },
  { status: "成約", label: "成約", color: "#10B981" },
]

function ConversionFunnel({ statusCounts }: { statusCounts: Record<string, number> }) {
  // Calculate cumulative counts (each step includes all steps at or beyond that stage)
  const cumulativeCounts = FUNNEL_STEPS.map((step, i) => {
    let count = 0
    for (let j = i; j < FUNNEL_STEPS.length; j++) {
      count += statusCounts[FUNNEL_STEPS[j].status] ?? 0
    }
    return count
  })

  const maxCount = cumulativeCounts[0] || 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>コンバージョンファネル</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {FUNNEL_STEPS.map((step, i) => {
            const count = cumulativeCounts[i]
            const widthPct = Math.max((count / maxCount) * 100, 8)
            const prevCount = i > 0 ? cumulativeCounts[i - 1] : null
            const dropOff =
              prevCount != null && prevCount > 0
                ? Math.round((count / prevCount) * 100)
                : null

            return (
              <div key={step.status}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: step.color }}
                    />
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums">
                      {count.toLocaleString("ja-JP")}
                    </span>
                    {dropOff != null && (
                      <span className="text-xs text-muted-foreground">
                        ({dropOff}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 overflow-hidden rounded-md bg-muted/50">
                  <div
                    className="flex h-full items-center rounded-md px-2 transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${step.color}30, ${step.color}18)`,
                      borderLeft: `3px solid ${step.color}`,
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: step.color }}>
                      {statusCounts[step.status] ?? 0}件
                    </span>
                  </div>
                </div>
                {i < FUNNEL_STEPS.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowRight className="h-3 w-3 rotate-90 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
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
                <TableCell className="text-right tabular-nums">{g.total.toLocaleString("ja-JP")}</TableCell>
                <TableCell className="text-right tabular-nums">{g.engaged.toLocaleString("ja-JP")}</TableCell>
                <TableCell className="text-right tabular-nums">{g.negotiating.toLocaleString("ja-JP")}</TableCell>
                <TableCell className="text-right tabular-nums">{g.closed.toLocaleString("ja-JP")}</TableCell>
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
  const supabase = createClient()
  const requestIdRef = useRef(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [genreSummaries, setGenreSummaries] = useState<GenreSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch genre stats and cross-genre summary in parallel
  useEffect(() => {
    if (!currentGenre || genres.length === 0) return
    const requestId = ++requestIdRef.current
    ;(async () => {
      setLoading(true)
      const [genreStatsRes, crossGenreRes] = await Promise.all([
        supabase
          .from("lm_companies")
          .select("status, email, source")
          .eq("genre_id", currentGenre.id),
        supabase
          .from("lm_companies")
          .select("genre_id, status"),
      ])

      if (requestIdRef.current !== requestId) return
      if (genreStatsRes.error || crossGenreRes.error) {
        toast.error("ダッシュボードデータの取得に失敗しました")
        setLoading(false)
        return
      }

      // Current genre stats
      const companies = (genreStatsRes.data ?? []) as Pick<Company, "status" | "email" | "source">[]
      setStats(computeStats(companies))

      // Cross-genre summary
      const allCompanies = (crossGenreRes.data ?? []) as { genre_id: string; status: CompanyStatus }[]
      const byGenre = new Map<string, { total: number; engaged: number; negotiating: number; closed: number }>()

      for (const c of allCompanies) {
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
      setLoading(false)
    })()
  }, [currentGenre, genres])

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          {currentGenre.name} の詳細分析
        </p>
      </div>

      {/* KPI Cards */}
      {loading || !stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* Conversion Funnel + Charts */}
      {stats && (
        <div className="space-y-6">
          {/* Funnel */}
          <ConversionFunnel statusCounts={stats.statusCounts} />

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
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
        </div>
      )}

      {/* Cross-genre summary */}
      <GenreSummaryTable summaries={genreSummaries} />
    </div>
  )
}
