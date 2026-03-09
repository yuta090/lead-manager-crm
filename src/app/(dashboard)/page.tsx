"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Building2, Mail, MessageSquare, Handshake, Trophy, Clock, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import { KpiCard, KpiGrid } from "@/components/kpi-card"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

function WelcomeSection({ genreName }: { genreName: string }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const greeting = useMemo(() => {
    const hour = now.getHours()
    if (hour < 12) return "おはようございます"
    if (hour < 18) return "こんにちは"
    return "お疲れさまです"
  }, [now])

  const dateStr = now.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Tokyo",
  })

  const timeStr = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  })

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
      <p className="text-sm text-muted-foreground">{dateStr} {timeStr}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{greeting}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {genreName} の概要ダッシュボード
      </p>
    </div>
  )
}

type RecentActivity = {
  id: string
  type: string
  description: string | null
  created_at: string
  company_name: string
}

function RecentActivitySection({ genreId }: { genreId: string }) {
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const supabase = createClient()

      // Fetch recent activities joined with companies in this genre
      const { data: companyData } = await supabase
        .from("lm_companies")
        .select("id, name")
        .eq("genre_id", genreId)

      if (!companyData || companyData.length === 0) {
        setActivities([])
        setLoading(false)
        return
      }

      const companyMap = new Map(companyData.map((c: { id: string; name: string }) => [c.id, c.name]))
      const companyIds = companyData.map((c: { id: string; name: string }) => c.id)

      const { data: activityData } = await supabase
        .from("lm_activities")
        .select("id, company_id, type, description, created_at")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false })
        .limit(5)

      type ActivityRow = { id: string; company_id: string; type: string; description: string | null; created_at: string }
      const mapped: RecentActivity[] = (activityData ?? []).map((a: ActivityRow) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        created_at: a.created_at,
        company_name: companyMap.get(a.company_id) ?? "不明",
      }))

      setActivities(mapped)
      setLoading(false)
    })()
  }, [genreId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          最近のアクティビティ
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            アクティビティがありません
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{activity.type}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                    <span className="truncate text-xs text-muted-foreground">
                      {activity.company_name}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                      {activity.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground/60">
                  {formatDate(activity.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function HomePage() {
  const { currentGenre, loading: genreLoading } = useGenre()
  const supabase = createClient()
  const requestIdRef = useRef(0)
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
    const requestId = ++requestIdRef.current
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("lm_companies")
        .select("id, status, email")
        .eq("genre_id", currentGenre.id)

      if (requestIdRef.current !== requestId) return
      if (error) {
        toast.error("データの取得に失敗しました")
        setLoading(false)
        return
      }

      const companies = (data ?? []) as { id: string; status: string; email: string | null }[]
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
      <WelcomeSection genreName={currentGenre.name} />

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

      {/* Recent Activity Section */}
      <RecentActivitySection genreId={currentGenre.id} />
    </div>
  )
}
