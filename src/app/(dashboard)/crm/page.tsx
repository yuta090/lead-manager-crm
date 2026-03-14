"use client"

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  ChevronDown,
  ChevronRight,
  Calendar,
  Plus,
  MessageSquare,
  PhoneCall,
  Handshake,
  Send,
  Footprints,
  MoreHorizontal,
  AlertCircle,
  Clock,
  CalendarCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatDate, toLocalDateString, addDays } from "@/lib/format"
import { useGenre } from "@/components/layout/genre-provider"
import { StatusBadge, PriorityDot } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import type { Company, Activity, CompanyStatus } from "@/types/database"
import { STATUS_ORDER, STATUS_CONFIG } from "@/types/database"
import { CompanyEditSheet } from "@/features/crm/components/detail/company-edit-sheet"

// ── Constants ──

const PIPELINE_STATUSES: CompanyStatus[] = [
  "新規",
  "送信済",
  "反応あり",
  "商談中",
  "成約",
]

const INACTIVE_STATUSES: CompanyStatus[] = ["失注", "配信停止"]

const MAX_CARDS_PER_COLUMN = 15

const ACTIVITY_TYPES = [
  { value: "メモ", icon: MessageSquare, color: "#6B7280" },
  { value: "電話", icon: PhoneCall, color: "#2563EB" },
  { value: "商談", icon: Handshake, color: "#F97316" },
  { value: "メール送信", icon: Send, color: "#7C3AED" },
  { value: "訪問", icon: Footprints, color: "#059669" },
  { value: "その他", icon: MoreHorizontal, color: "#9CA3AF" },
] as const

type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number]["value"]

// ── Helpers ──

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return ""
  return dateStr.split("T")[0]
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const todayStr = toLocalDateString()
  const dateOnly = dateStr.split("T")[0]
  return dateOnly < todayStr
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const todayStr = toLocalDateString()
  return dateStr.startsWith(todayStr)
}

function truncate(text: string | null, max: number): string {
  if (!text) return ""
  return text.length > max ? text.slice(0, max) + "..." : text
}

// ── Main Page Component ──

export default function CrmPage() {
  const { currentGenre, loading: genreLoading } = useGenre()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const requestIdRef = useRef(0)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  // URL state: tab, company
  const tabFromUrl = searchParams.get("tab") as "pipeline" | "detail" | "followup" | null
  const companyFromUrl = searchParams.get("company")

  const [activeTab, setActiveTab] = useState<string | number>(() => {
    if (tabFromUrl) return tabFromUrl
    return companyFromUrl ? "detail" : "pipeline"
  })
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => {
    return companyFromUrl
  })

  // URL sync helper
  const updateUrl = useCallback((params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) newParams.delete(key)
      else newParams.set(key, value)
    })
    const qs = newParams.toString()
    router.replace(qs ? `/crm?${qs}` : "/crm", { scroll: false })
  }, [searchParams, router])

  const fetchCompanies = useCallback(async () => {
    if (!currentGenre) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    const { data, error } = await supabase
      .from("lm_companies")
      .select("id, name, status, email, memo, priority, next_followup_at, address, phone, website, prefecture, screening_result, screening_score, screening_reason, updated_at")
      .eq("genre_id", currentGenre.id)
      .order("updated_at", { ascending: false })
    if (requestIdRef.current !== requestId) return
    if (error) {
      toast.error("企業データの取得に失敗しました")
      setLoading(false)
      return
    }
    setCompanies((data as Company[]) ?? [])
    setLoading(false)
  }, [currentGenre])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Sync URL -> state on browser back/forward
  useEffect(() => {
    const tab = searchParams.get("tab")
    const company = searchParams.get("company")
    if (tab) {
      setActiveTab(tab)
    } else if (company) {
      setActiveTab("detail")
    }
    setSelectedCompanyId(company)
  }, [searchParams])

  const handleCardClick = useCallback((companyId: string) => {
    setSelectedCompanyId(companyId)
    setActiveTab("detail")
    updateUrl({ tab: "detail", company: companyId })
  }, [updateUrl])

  const handleCompanyUpdate = useCallback(
    (updated: Company) => {
      setCompanies((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      )
    },
    []
  )

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground">
          {currentGenre.name} - パイプライン管理
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value)
          const tab = String(value)
          updateUrl({ tab, ...(tab !== "detail" ? { company: null } : {}) })
        }}
      >
        <TabsList>
          <TabsTrigger value="pipeline">パイプライン</TabsTrigger>
          <TabsTrigger value="detail">企業詳細</TabsTrigger>
          <TabsTrigger value="followup">フォローアップ</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 min-w-[200px] animate-pulse rounded-lg bg-muted lg:min-w-0"
                />
              ))}
            </div>
          ) : (
            <PipelineView
              companies={companies}
              onCardClick={handleCardClick}
            />
          )}
        </TabsContent>

        <TabsContent value="detail">
          <CompanyDetailView
            companies={companies}
            loading={loading}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={(id) => {
              setSelectedCompanyId(id)
              updateUrl({ company: id })
            }}
            onCompanyUpdate={handleCompanyUpdate}
          />
        </TabsContent>

        <TabsContent value="followup">
          <FollowUpView
            companies={companies}
            loading={loading}
            onCardClick={handleCardClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Pipeline View ──

function PipelineView({
  companies,
  onCardClick,
}: {
  companies: Company[]
  onCardClick: (id: string) => void
}) {
  const [showInactive, setShowInactive] = useState(false)
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set())

  const columnData = useMemo(() => {
    const map: Record<string, Company[]> = {}
    for (const status of [...PIPELINE_STATUSES, ...INACTIVE_STATUSES]) {
      map[status] = []
    }
    for (const c of companies) {
      if (map[c.status]) {
        map[c.status].push(c)
      }
    }
    return map
  }, [companies])

  const hasInactive = INACTIVE_STATUSES.some(
    (s) => columnData[s]?.length > 0
  )

  return (
    <div className="space-y-6">
      {/* Active pipeline columns */}
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {PIPELINE_STATUSES.map((status) => {
          const items = columnData[status] ?? []
          const isExpanded = expandedColumns.has(status)
          const visibleItems = isExpanded ? items : items.slice(0, MAX_CARDS_PER_COLUMN)
          const overflow = items.length - MAX_CARDS_PER_COLUMN
          const config = STATUS_CONFIG[status]

          return (
            <div
              key={status}
              className="flex min-w-[200px] flex-col gap-2 overflow-hidden rounded-lg bg-muted/30 lg:min-w-0"
            >
              {/* Colored top border */}
              <div
                className="h-1"
                style={{ background: `linear-gradient(90deg, ${config.dot}, ${config.dot}60)` }}
              />

              {/* Column header */}
              <div className="flex items-center justify-between px-3">
                <StatusBadge status={status} />
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold"
                  style={{
                    color: config.color,
                    backgroundColor: config.bg,
                  }}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-1.5 px-2 pb-2">
                {visibleItems.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center"
                    style={{ borderColor: `${config.dot}30` }}
                  >
                    <div
                      className="mb-1.5 h-6 w-6 rounded-full opacity-30"
                      style={{ backgroundColor: config.dot }}
                    />
                    <span className="text-xs text-muted-foreground">企業なし</span>
                  </div>
                ) : (
                  visibleItems.map((company) => (
                    <PipelineCard
                      key={company.id}
                      company={company}
                      onClick={onCardClick}
                    />
                  ))
                )}
                {overflow > 0 && !isExpanded && (
                  <button
                    className="w-full rounded-lg border border-dashed border-muted-foreground/30 p-2 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/50"
                    onClick={() => setExpandedColumns(prev => new Set(prev).add(status))}
                  >
                    +{overflow} 件を表示
                  </button>
                )}
                {isExpanded && overflow > 0 && (
                  <button
                    className="w-full rounded-lg border border-dashed border-muted-foreground/30 p-2 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/50"
                    onClick={() => {
                      const next = new Set(expandedColumns)
                      next.delete(status)
                      setExpandedColumns(next)
                    }}
                  >
                    折りたたむ
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Inactive section */}
      {hasInactive && (
        <div className="rounded-lg border">
          <button
            className="flex w-full items-center gap-2 p-3 text-sm font-medium text-muted-foreground hover:bg-muted/50"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            非アクティブ（失注・配信停止）
          </button>
          {showInactive && (
            <div className="grid grid-cols-2 gap-3 p-3 pt-0">
              {INACTIVE_STATUSES.map((status) => {
                const items = columnData[status] ?? []
                if (items.length === 0) return null
                return (
                  <div
                    key={status}
                    className="flex flex-col gap-2 rounded-lg bg-muted/20 p-2"
                  >
                    <div className="flex items-center justify-between px-1">
                      <StatusBadge status={status} />
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.slice(0, MAX_CARDS_PER_COLUMN).map((company) => (
                        <PipelineCard
                          key={company.id}
                          company={company}
                          onClick={onCardClick}
                        />
                      ))}
                      {items.length > MAX_CARDS_PER_COLUMN && (
                        <div className="text-center text-xs text-muted-foreground">
                          +{items.length - MAX_CARDS_PER_COLUMN} 件
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const PipelineCard = React.memo(function PipelineCard({
  company,
  onClick,
}: {
  company: Company
  onClick: (id: string) => void
}) {
  const followupBadge = useMemo(() => {
    if (!company.next_followup_at) return null
    if (isOverdue(company.next_followup_at)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3 w-3" />
          期限超過
        </span>
      )
    }
    if (isToday(company.next_followup_at)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          <Clock className="h-3 w-3" />
          本日
        </span>
      )
    }
    return null
  }, [company.next_followup_at])

  return (
    <button
      className="flex flex-col gap-1 rounded-md border bg-card p-2.5 text-left shadow-sm transition-all duration-150 hover:bg-accent/50 hover:shadow-md"
      onClick={() => onClick(company.id)}
    >
      <div className="flex items-center gap-1.5">
        <PriorityDot priority={company.priority} />
        <span className="truncate text-sm font-medium">{company.name}</span>
      </div>
      {company.email && (
        <span className="truncate text-xs text-muted-foreground">
          {truncate(company.email, 25)}
        </span>
      )}
      {company.memo && (
        <span className="text-xs text-muted-foreground/70">
          {truncate(company.memo, 35)}
        </span>
      )}
      {followupBadge}
    </button>
  )
})

// ── Company Detail View ──

function CompanyDetailView({
  companies,
  loading,
  selectedCompanyId,
  onSelectCompany,
  onCompanyUpdate,
}: {
  companies: Company[]
  loading: boolean
  selectedCompanyId: string | null
  onSelectCompany: (id: string | null) => void
  onCompanyUpdate: (company: Company) => void
}) {
  const [open, setOpen] = useState(false)
  const company = companies.find((c) => c.id === selectedCompanyId) ?? null

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 max-w-sm animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (companies.length === 0) {
    return <EmptyState title="企業データがありません" />
  }

  return (
    <div className="space-y-4">
      {/* Company selector (Combobox) */}
      <div className="max-w-sm">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="企業を選択"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !company && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {company ? company.name : "企業を選択..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="会社名・メール・電話で検索..." />
              <CommandList>
                <CommandEmpty>該当する企業がありません</CommandEmpty>
                <CommandGroup>
                  {companies.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      keywords={[c.name, c.email ?? "", c.phone ?? ""].filter(Boolean)}
                      onSelect={(val) => {
                        onSelectCompany(val)
                        setOpen(false)
                      }}
                      data-checked={selectedCompanyId === c.id ? "true" : undefined}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCompanyId === c.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{c.name}</div>
                        {c.email && (
                          <div className="truncate text-xs text-muted-foreground">
                            {c.email}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {!company ? (
        <EmptyState
          title="企業を選択してください"
          description="上のドロップダウンから企業を選択すると詳細が表示されます"
        />
      ) : (
        <CompanyDetailContent
          company={company}
          onCompanyUpdate={onCompanyUpdate}
        />
      )}
    </div>
  )
}

function CompanyDetailContent({
  company,
  onCompanyUpdate,
}: {
  company: Company
  onCompanyUpdate: (company: Company) => void
}) {
  const [activityVersion, setActivityVersion] = useState(0)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <CompanyInfoCard company={company} />
        <CompanyStatusControls
          company={company}
          onCompanyUpdate={onCompanyUpdate}
        />
      </div>
      <div className="space-y-4">
        <ActivityForm
          companyId={company.id}
          onActivityAdded={() => setActivityVersion((v) => v + 1)}
        />
        <ActivityHistory companyId={company.id} refreshKey={activityVersion} />
      </div>
    </div>
  )
}

function CompanyInfoCard({ company }: { company: Company }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {company.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {company.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{company.address}</span>
          </div>
        )}
        {company.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{company.phone}</span>
          </div>
        )}
        {company.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{company.email}</span>
          </div>
        )}
        {company.website && (() => {
          let isSafe = false
          try {
            const url = new URL(company.website)
            isSafe = url.protocol === "http:" || url.protocol === "https:"
          } catch {}
          return (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {isSafe ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-blue-600 hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                <span className="truncate text-muted-foreground">{company.website}</span>
              )}
            </div>
          )
        })()}
        {company.prefecture && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Badge variant="outline">{company.prefecture}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompanyStatusControls({
  company,
  onCompanyUpdate,
}: {
  company: Company
  onCompanyUpdate: (company: Company) => void
}) {
  const [saving, setSaving] = useState(false)

  const handleStatusChange = async (newStatus: string | null) => {
    if (newStatus == null) return
    const status = newStatus as CompanyStatus
    if (status === company.status) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("lm_companies")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", company.id)

    if (!error) {
      // Add activity log
      await supabase.from("lm_activities").insert({
        company_id: company.id,
        type: "ステータス変更",
        description: `${company.status} → ${status}`,
      })
      onCompanyUpdate({ ...company, status })
      toast.success(`ステータスを「${status}」に変更しました`)
    } else {
      toast.error("ステータスの変更に失敗しました")
    }
    setSaving(false)
  }

  const handlePriorityChange = async (newPriority: string | number | null) => {
    if (newPriority == null) return
    const priority = String(newPriority) as Company["priority"]
    if (priority === company.priority) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("lm_companies")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", company.id)

    if (!error) {
      onCompanyUpdate({ ...company, priority })
      toast.success(`優先度を「${priority}」に変更しました`)
    } else {
      toast.error("優先度の変更に失敗しました")
    }
    setSaving(false)
  }

  const handleFollowUpChange = async (date: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("lm_companies")
      .update({
        next_followup_at: date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id)

    if (!error) {
      onCompanyUpdate({ ...company, next_followup_at: date || null })
      toast.success("フォローアップ日を更新しました")
    } else {
      toast.error("フォローアップ日の更新に失敗しました")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">ステータス・設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            ステータス
          </label>
          <Select
            value={company.status}
            onValueChange={handleStatusChange}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STATUS_CONFIG[s].dot }}
                    />
                    {s}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            優先度
          </label>
          <Select
            value={company.priority}
            onValueChange={handlePriorityChange}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="高">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  高
                </span>
              </SelectItem>
              <SelectItem value="通常">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  通常
                </span>
              </SelectItem>
              <SelectItem value="低">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                  低
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Follow-up date */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            <Calendar className="mr-1 inline h-3 w-3" />
            フォローアップ日
          </label>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleFollowUpChange(addDays(1))}
            >
              明日
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleFollowUpChange(addDays(3))}
            >
              3日後
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleFollowUpChange(addDays(7))}
            >
              1週間後
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleFollowUpChange(addDays(30))}
            >
              1ヶ月後
            </Button>
          </div>
          <Input
            type="date"
            value={toDateInputValue(company.next_followup_at)}
            onChange={(e) => handleFollowUpChange(e.target.value)}
          />
          {company.next_followup_at && (
            <p className="text-xs text-muted-foreground">
              現在: {formatDate(company.next_followup_at)}
              {isOverdue(company.next_followup_at) && (
                <span className="ml-1 text-red-500">（期限超過）</span>
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Activity Form ──

function ActivityForm({
  companyId,
  onActivityAdded,
}: {
  companyId: string
  onActivityAdded: () => void
}) {
  const [type, setType] = useState<ActivityTypeValue>("メモ")
  const [description, setDescription] = useState("")
  const [createdBy, setCreatedBy] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lm_staff_name") ?? ""
    }
    return ""
  })
  const [submitting, setSubmitting] = useState(false)

  // Reset form when company changes
  useEffect(() => {
    setDescription("")
  }, [companyId])

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("内容を入力してください")
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from("lm_activities").insert({
      company_id: companyId,
      type,
      description: description.trim(),
      created_by: createdBy.trim() || null,
    })

    if (!error) {
      toast.success("活動を記録しました")
      setDescription("")
      onActivityAdded()
    } else {
      toast.error("活動の記録に失敗しました")
    }
    setSubmitting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" />
          活動を記録
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Type selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            種類
          </label>
          <Select
            value={type}
            onValueChange={(val) => { if (val != null) setType(String(val) as ActivityTypeValue) }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.value}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            内容
          </label>
          <Textarea
            placeholder="活動内容を入力..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Staff name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            担当者
          </label>
          <Input
            placeholder="担当者名（任意）"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !description.trim()}
          className="w-full"
        >
          {submitting ? "記録中..." : "記録する"}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Activity History ──

function ActivityHistory({ companyId, refreshKey }: { companyId: string; refreshKey: number }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const activityRequestIdRef = useRef(0)
  const isInitialLoadRef = useRef(true)

  const fetchActivities = useCallback(async () => {
    const requestId = ++activityRequestIdRef.current
    const isInitial = isInitialLoadRef.current

    if (isInitial) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from("lm_activities")
      .select("id, company_id, type, description, created_by, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(30)
    if (activityRequestIdRef.current !== requestId) return
    if (error) {
      toast.error("活動履歴の取得に失敗しました")
      if (isInitial) {
        setLoading(false)
      } else {
        setIsRefreshing(false)
      }
      return
    }
    setActivities(data ?? [])
    if (isInitial) {
      isInitialLoadRef.current = false
      setLoading(false)
    } else {
      setIsRefreshing(false)
    }
  }, [companyId])

  // Reset initial load flag and clear stale state when company changes
  useEffect(() => {
    isInitialLoadRef.current = true
    setActivities([])
    setIsRefreshing(false)
  }, [companyId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities, refreshKey])

  // Poll when tab is visible (reduced frequency since refreshKey handles immediate updates)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchActivities()
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchActivities])

  const getActivityColor = (type: string): string => {
    const found = ACTIVITY_TYPES.find((t) => t.value === type)
    if (found) return found.color
    // System activity types
    if (type === "ステータス変更") return "#2563EB"
    return "#6B7280"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          活動履歴
          {isRefreshing && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            活動記録がありません
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1.5 flex flex-col items-center">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: getActivityColor(activity.type),
                    }}
                  />
                  <span className="w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {activity.type}
                    </span>
                    {activity.created_by && (
                      <span className="text-xs text-muted-foreground">
                        by {activity.created_by}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Follow-up View ──

function FollowUpView({
  companies,
  loading,
  onCardClick,
}: {
  companies: Company[]
  loading: boolean
  onCardClick: (id: string) => void
}) {
  const { overdue, today, upcoming } = useMemo(() => {
    const withFollowUp = companies.filter((c) => c.next_followup_at)
    const todayStr = toLocalDateString()

    const overdue: Company[] = []
    const today: Company[] = []
    const upcoming: Company[] = []

    for (const c of withFollowUp) {
      const dateStr = c.next_followup_at!
      const dateOnly = dateStr.split("T")[0]
      if (dateOnly === todayStr) {
        today.push(c)
      } else if (dateOnly < todayStr) {
        overdue.push(c)
      } else {
        upcoming.push(c)
      }
    }

    // Sort overdue: oldest first
    overdue.sort(
      (a, b) =>
        new Date(a.next_followup_at!).getTime() -
        new Date(b.next_followup_at!).getTime()
    )
    // Sort upcoming: soonest first
    upcoming.sort(
      (a, b) =>
        new Date(a.next_followup_at!).getTime() -
        new Date(b.next_followup_at!).getTime()
    )

    return { overdue, today, upcoming }
  }, [companies])

  const noFollowUps =
    overdue.length === 0 && today.length === 0 && upcoming.length === 0

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (noFollowUps) {
    return (
      <EmptyState
        title="フォローアップの予定がありません"
        description="企業詳細からフォローアップ日を設定してください"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <AlertCircle className="h-4 w-4" />
            期限超過（{overdue.length}件）
          </h3>
          <FollowUpTable
            companies={overdue}
            onCardClick={onCardClick}
            highlight="overdue"
          />
        </div>
      )}

      {/* Today */}
      {today.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-600">
            <Clock className="h-4 w-4" />
            本日（{today.length}件）
          </h3>
          <FollowUpTable
            companies={today}
            onCardClick={onCardClick}
            highlight="today"
          />
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarCheck className="h-4 w-4" />
            今後の予定（{upcoming.length}件）
          </h3>
          <FollowUpTable
            companies={upcoming}
            onCardClick={onCardClick}
            highlight="none"
          />
        </div>
      )}
    </div>
  )
}

function FollowUpTable({
  companies,
  onCardClick,
  highlight,
}: {
  companies: Company[]
  onCardClick: (id: string) => void
  highlight: "overdue" | "today" | "none"
}) {
  const rowBg =
    highlight === "overdue"
      ? "bg-red-50 dark:bg-red-950/20"
      : highlight === "today"
        ? "bg-blue-50 dark:bg-blue-950/20"
        : ""

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">企業名</th>
            <th className="px-3 py-2 text-left font-medium">ステータス</th>
            <th className="px-3 py-2 text-left font-medium">優先度</th>
            <th className="px-3 py-2 text-left font-medium">
              フォローアップ日
            </th>
            <th className="px-3 py-2 text-left font-medium">メモ</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr
              key={c.id}
              className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${rowBg}`}
              onClick={() => onCardClick(c.id)}
            >
              <td className="px-3 py-2 font-medium">
                <div className="flex items-center gap-1.5">
                  <PriorityDot priority={c.priority} />
                  {c.name}
                </div>
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-3 py-2">{c.priority}</td>
              <td className="px-3 py-2">
                <span
                  className={
                    highlight === "overdue"
                      ? "font-medium text-red-600"
                      : highlight === "today"
                        ? "font-medium text-blue-600"
                        : ""
                  }
                >
                  {formatDate(c.next_followup_at)}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {truncate(c.memo, 30)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
