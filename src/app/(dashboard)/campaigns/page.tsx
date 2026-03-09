"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Send,
  FileText,
  BarChart3,
  Trash2,
  Plus,
  Mail,
  MousePointerClick,
  AlertTriangle,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/format"
import { useGenre } from "@/components/layout/genre-provider"
import { EmptyState } from "@/components/empty-state"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { KpiCard, KpiGrid } from "@/components/kpi-card"
import type { Campaign, EmailLog } from "@/types/database"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CampaignStatusBadge({ status }: { status: Campaign["status"] }) {
  const styles: Record<Campaign["status"], { bg: string; color: string }> = {
    下書き: { bg: "#F3F4F6", color: "#6B7280" },
    送信中: { bg: "#DBEAFE", color: "#2563EB" },
    送信済: { bg: "#DCFCE7", color: "#16A34A" },
  }
  const s = styles[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tab 1: Template creation
// ---------------------------------------------------------------------------

function TemplateTab({ genreId }: { genreId: string }) {
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !subject.trim()) {
      toast.error("キャンペーン名と件名は必須です")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("lm_campaigns").insert({
      genre_id: genreId,
      name: name.trim(),
      subject_template: subject.trim(),
      body_template: bodyHtml,
      body_text: bodyText || null,
      status: "下書き",
      sent_count: 0,
    })
    setSaving(false)
    if (error) {
      toast.error("保存に失敗しました: " + error.message)
    } else {
      toast.success("テンプレートを下書き保存しました")
      setName("")
      setSubject("")
      setBodyHtml("")
      setBodyText("")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>テンプレート作成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">キャンペーン名</Label>
            <Input
              id="campaign-name"
              placeholder="例: 初回メール配信"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-template">件名テンプレート</Label>
            <Input
              id="subject-template"
              placeholder="例: {{会社名}} 様へのご案内"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body-html">本文（HTML）</Label>
            <Textarea
              id="body-html"
              placeholder="HTMLメール本文を入力..."
              rows={10}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body-text">本文（プレーンテキスト）</Label>
            <Textarea
              id="body-text"
              placeholder="テキストメール本文を入力..."
              rows={6}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
            />
          </div>

          <Card size="sm">
            <CardContent className="text-xs text-muted-foreground">
              <p className="mb-1 font-medium">利用可能な変数:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "{{会社名}}",
                  "{{住所}}",
                  "{{電話番号}}",
                  "{{ウェブサイト}}",
                  "{{配信停止URL}}",
                ].map((v) => (
                  <code
                    key={v}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono"
                  >
                    {v}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving}>
            <FileText className="mr-1.5 h-4 w-4" />
            {saving ? "保存中..." : "下書き保存"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2: Campaign list
// ---------------------------------------------------------------------------

function CampaignListTab({ genreId }: { genreId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const requestIdRef = useRef(0)

  const fetchCampaigns = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("lm_campaigns")
      .select("id, genre_id, name, subject_template, body_template, body_text, status, sent_count, sent_at, created_at")
      .eq("genre_id", genreId)
      .order("created_at", { ascending: false })
    if (requestIdRef.current !== requestId) return
    if (error) {
      toast.error("キャンペーンの取得に失敗しました")
      setLoading(false)
      return
    }
    setCampaigns((data as Campaign[]) ?? [])
    setLoading(false)
  }, [genreId])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  async function handleDelete() {
    if (!deleteTargetId) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from("lm_campaigns").delete().eq("id", deleteTargetId).eq("genre_id", genreId)
    if (error) {
      toast.error("削除に失敗しました: " + error.message)
    } else {
      toast.success("キャンペーンを削除しました")
      fetchCampaigns()
    }
    setDeleting(false)
    setDeleteTargetId(null)
  }

  const deleteTarget = campaigns.find((c) => c.id === deleteTargetId)

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="キャンペーンがありません"
        description="「テンプレート作成」タブから新しいキャンペーンを作成してください"
      />
    )
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>キャンペーン名</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">送信数</TableHead>
              <TableHead>送信日</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <CampaignStatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-right">{c.sent_count}</TableCell>
                <TableCell>{formatDate(c.sent_at)}</TableCell>
                <TableCell>
                  {c.status === "下書き" && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteTargetId(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>キャンペーンを削除</DialogTitle>
            <DialogDescription>
              本当に削除しますか？キャンペーン「{deleteTarget?.name}」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTargetId(null)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tab 3: Statistics
// ---------------------------------------------------------------------------

type CampaignStats = {
  id: string
  name: string
  sent_at: string | null
  sent_count: number
  openRate: number
  clickRate: number
  bounceRate: number
}

function StatsTab({ genreId }: { genreId: string }) {
  const [stats, setStats] = useState<CampaignStats[]>([])
  const [loading, setLoading] = useState(true)
  const statsRequestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++statsRequestIdRef.current
    ;(async () => {
      setLoading(true)
      setStats([])
      const supabase = createClient()

      // First fetch campaigns to get their IDs
      const campaignsRes = await supabase
        .from("lm_campaigns")
        .select("id, name, sent_at, sent_count")
        .eq("genre_id", genreId)
        .in("status", ["送信済", "送信中"])
        .order("sent_at", { ascending: false })

      if (statsRequestIdRef.current !== requestId) return
      if (campaignsRes.error) {
        toast.error("統計データの取得に失敗しました")
        setLoading(false)
        return
      }

      const sentCampaigns = (campaignsRes.data ?? []) as Pick<
        Campaign,
        "id" | "name" | "sent_at" | "sent_count"
      >[]

      if (sentCampaigns.length === 0) {
        setStats([])
        setLoading(false)
        return
      }

      // Fetch email logs only for relevant campaigns (server-side filter)
      const campaignIds = sentCampaigns.map((c) => c.id)
      const logsRes = await supabase
        .from("lm_email_logs")
        .select("campaign_id, status, opened_at, clicked_at")
        .in("campaign_id", campaignIds)

      if (statsRequestIdRef.current !== requestId) return
      if (logsRes.error) {
        toast.error("メールログの取得に失敗しました")
        setLoading(false)
        return
      }

      const emailLogs = (logsRes.data ?? []) as Pick<
        EmailLog,
        "campaign_id" | "status" | "opened_at" | "clicked_at"
      >[]

      // Group logs by campaign
      const logsByCampaign = new Map<string, typeof emailLogs>()
      for (const log of emailLogs) {
        if (!log.campaign_id) continue
        const arr = logsByCampaign.get(log.campaign_id) ?? []
        arr.push(log)
        logsByCampaign.set(log.campaign_id, arr)
      }

      const result: CampaignStats[] = sentCampaigns.map((c) => {
        const cLogs = logsByCampaign.get(c.id) ?? []
        const total = cLogs.length || 1
        const opened = cLogs.filter((l) => l.opened_at).length
        const clicked = cLogs.filter((l) => l.clicked_at).length
        const bounced = cLogs.filter((l) => l.status === "bounced").length
        return {
          id: c.id,
          name: c.name,
          sent_at: c.sent_at,
          sent_count: c.sent_count,
          openRate: Math.round((opened / total) * 100),
          clickRate: Math.round((clicked / total) * 100),
          bounceRate: Math.round((bounced / total) * 100),
        }
      })

      setStats(result)
      setLoading(false)
    })()
  }, [genreId])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <EmptyState
        title="配信実績がありません"
        description="キャンペーンを送信すると、ここに統計が表示されます"
      />
    )
  }

  return (
    <div className="space-y-4">
      {stats.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{s.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                送信日: {formatDate(s.sent_at)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KpiGrid>
              <KpiCard
                label="送信数"
                value={s.sent_count}
                color="#2563EB"
                icon={<Send className="h-5 w-5" style={{ color: "#2563EB" }} />}
              />
              <KpiCard
                label="開封率"
                value={`${s.openRate}%`}
                color="#0284C7"
                icon={<Eye className="h-5 w-5" style={{ color: "#0284C7" }} />}
              />
              <KpiCard
                label="クリック率"
                value={`${s.clickRate}%`}
                color="#059669"
                icon={
                  <MousePointerClick
                    className="h-5 w-5"
                    style={{ color: "#059669" }}
                  />
                }
              />
              <KpiCard
                label="バウンス率"
                value={`${s.bounceRate}%`}
                color="#DC2626"
                icon={
                  <AlertTriangle
                    className="h-5 w-5"
                    style={{ color: "#DC2626" }}
                  />
                }
              />
            </KpiGrid>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const { currentGenre, loading: genreLoading } = useGenre()

  if (genreLoading) {
    return (
      <LoadingSpinner />
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
        <h1 className="text-2xl font-bold tracking-tight">メール配信</h1>
        <p className="text-sm text-muted-foreground">
          {currentGenre.name} のキャンペーン管理
        </p>
      </div>

      <Tabs defaultValue="template">
        <TabsList>
          <TabsTrigger value="template">
            <Plus className="mr-1 h-3.5 w-3.5" />
            テンプレート作成
          </TabsTrigger>
          <TabsTrigger value="list">
            <Mail className="mr-1 h-3.5 w-3.5" />
            キャンペーン一覧
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-1 h-3.5 w-3.5" />
            配信統計
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          <TemplateTab genreId={currentGenre.id} />
        </TabsContent>

        <TabsContent value="list">
          <CampaignListTab genreId={currentGenre.id} />
        </TabsContent>

        <TabsContent value="stats">
          <StatsTab genreId={currentGenre.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
