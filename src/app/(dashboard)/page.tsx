"use client"

import { useEffect, useState } from "react"
import { Building2, Mail, MessageSquare, Handshake, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import { KpiCard, KpiGrid } from "@/components/kpi-card"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import type { Company, CompanyStatus } from "@/types/database"

export default function HomePage() {
  const { currentGenre, loading: genreLoading } = useGenre()
  const [stats, setStats] = useState<{
    total: number
    withEmail: number
    engaged: number
    negotiating: number
    closed: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentGenre) return
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from("lm_companies")
        .select("id, status, email")
        .eq("genre_id", currentGenre.id)

      const companies = data ?? []
      const statusMap: Record<string, number> = {}
      for (const c of companies) {
        statusMap[c.status] = (statusMap[c.status] ?? 0) + 1
      }

      setStats({
        total: companies.length,
        withEmail: companies.filter((c) => c.email).length,
        engaged: statusMap["反応あり"] ?? 0,
        negotiating: statusMap["商談中"] ?? 0,
        closed: statusMap["成約"] ?? 0,
      })
      setLoading(false)
    })()
  }, [currentGenre])

  if (genreLoading) {
    return <div className="animate-pulse text-muted-foreground">読み込み中...</div>
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
        <h1 className="text-2xl font-bold">{currentGenre.name}</h1>
        <p className="text-sm text-muted-foreground">概要ダッシュボード</p>
      </div>

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
            icon={<Building2 className="h-5 w-5" style={{ color: "#2563EB" }} />}
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
            icon={<MessageSquare className="h-5 w-5" style={{ color: "#D97706" }} />}
          />
          <KpiCard
            label="商談中"
            value={stats.negotiating}
            color="#F97316"
            icon={<Handshake className="h-5 w-5" style={{ color: "#F97316" }} />}
          />
          <KpiCard
            label="成約"
            value={stats.closed}
            color="#059669"
            icon={<Trophy className="h-5 w-5" style={{ color: "#059669" }} />}
          />
        </KpiGrid>
      )}
    </div>
  )
}
