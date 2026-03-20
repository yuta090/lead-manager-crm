"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { PromptVersion, Company } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ArrowLeft, FlaskConical, Loader2, Eye } from "lucide-react"
import Link from "next/link"

type ModelOption = { provider: "openai" | "anthropic"; model: string; label: string }

const MODEL_OPTIONS: ModelOption[] = [
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o mini" },
  { provider: "openai", model: "gpt-4o", label: "GPT-4o" },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { provider: "anthropic", model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
]

type GenerationResult = {
  company_id: string
  company_name: string
  provider: string
  model: string
  subject: string | null
  body: string | null
  variant: "personalized" | "static"
  fallback_reason: string | null
  quality_score: number | null
  latency_ms: number
  error: string | null
}

type CompanyWithIntel = Company & { scrape_target_id: string | null; intel_quality?: number }

export default function PromptTestPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [version, setVersion] = useState<PromptVersion | null>(null)
  const [companies, setCompanies] = useState<CompanyWithIntel[]>([])
  const [loading, setLoading] = useState(true)

  // 選択状態
  const [selectedModels, setSelectedModels] = useState<Set<number>>(new Set([0]))
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())

  // テスト結果
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<GenerationResult[]>([])
  const [detailResult, setDetailResult] = useState<GenerationResult | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: pv }, { data: cos }] = await Promise.all([
        supabase
          .from("lm_prompt_versions")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("lm_companies")
          .select("id, name, scrape_target_id, genre_id")
          .not("scrape_target_id", "is", null)
          .order("name")
          .limit(100),
      ])
      setVersion(pv as PromptVersion)
      setCompanies((cos as CompanyWithIntel[]) ?? [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  const toggleModel = (idx: number) => {
    const next = new Set(selectedModels)
    if (next.has(idx)) next.delete(idx)
    else if (next.size < 3) next.add(idx)
    setSelectedModels(next)
  }

  const toggleCompany = (cid: string) => {
    const next = new Set(selectedCompanies)
    if (next.has(cid)) next.delete(cid)
    else if (next.size < 10) next.add(cid)
    setSelectedCompanies(next)
  }

  const runTest = async () => {
    if (!selectedCompanies.size || !selectedModels.size) {
      toast.error("企業とモデルを選択してください")
      return
    }
    setRunning(true)
    setResults([])
    try {
      const res = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_version_id: id,
          company_ids: [...selectedCompanies],
          models: [...selectedModels].map((i) => ({
            provider: MODEL_OPTIONS[i].provider,
            model: MODEL_OPTIONS[i].model,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "テスト実行に失敗しました")
        setRunning(false)
        return
      }
      const data = await res.json()
      setResults(data.results)
      toast.success(`${data.results.length}件の生成が完了しました`)
    } catch (err) {
      toast.error("テスト実行エラー")
    }
    setRunning(false)
  }

  if (loading) return <LoadingSpinner />
  if (!version) return null

  const activeModels = [...selectedModels].map((i) => MODEL_OPTIONS[i])
  const uniqueCompanyIds = [...new Set(results.map((r) => r.company_id))]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/prompts/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">テスト実行</h1>
          <p className="text-sm text-muted-foreground">{version.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* モデル選択 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">モデル選択（最大3）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {MODEL_OPTIONS.map((m, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedModels.has(i)}
                  onCheckedChange={() => toggleModel(i)}
                />
                <span className="text-sm">{m.label}</span>
                <Badge variant="outline" className="text-xs">{m.provider}</Badge>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* 企業選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              企業選択（最大10）
              <span className="font-normal text-muted-foreground ml-2">
                {selectedCompanies.size}件選択中 / Intel有り{companies.length}件
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto space-y-1">
            {companies.map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedCompanies.has(c.id)}
                  onCheckedChange={() => toggleCompany(c.id)}
                />
                <span className="text-sm truncate">{c.name}</span>
              </label>
            ))}
            {companies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                company_intel のある企業がありません
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={runTest} disabled={running || !selectedCompanies.size || !selectedModels.size}>
        {running ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成中...</>
        ) : (
          <><FlaskConical className="mr-2 h-4 w-4" /> テスト実行 ({selectedCompanies.size}社 × {selectedModels.size}モデル)</>
        )}
      </Button>

      {/* 結果グリッド */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">テスト結果</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">企業</th>
                  {activeModels.map((m, i) => (
                    <th key={i} className="text-left py-2 px-3 font-medium min-w-[250px]">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueCompanyIds.map((cid) => (
                  <tr key={cid} className="border-b">
                    <td className="py-3 pr-4 font-medium align-top">
                      {results.find((r) => r.company_id === cid)?.company_name}
                    </td>
                    {activeModels.map((m, mi) => {
                      const r = results.find(
                        (r) => r.company_id === cid && r.model === m.model,
                      )
                      if (!r) return <td key={mi} className="px-3 py-3">-</td>
                      const bgClass =
                        r.error
                          ? "bg-red-50"
                          : r.variant === "personalized"
                            ? "bg-green-50"
                            : "bg-yellow-50"
                      return (
                        <td key={mi} className={`px-3 py-3 align-top ${bgClass} rounded`}>
                          {r.error ? (
                            <p className="text-xs text-red-600">{r.error}</p>
                          ) : (
                            <>
                              <p className="font-medium text-xs mb-1">{r.subject}</p>
                              <p className="text-xs text-muted-foreground line-clamp-3">
                                {r.body}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge
                                  variant={r.variant === "personalized" ? "default" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {r.variant}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {r.latency_ms}ms
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1"
                                  onClick={() => setDetailResult(r)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 全文表示ダイアログ */}
      <Dialog open={detailResult !== null} onOpenChange={(o) => { if (!o) setDetailResult(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detailResult?.company_name} — {detailResult?.model}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">件名</p>
              <p className="text-sm font-medium">{detailResult?.subject}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">本文</p>
              <p className="text-sm whitespace-pre-wrap">{detailResult?.body}</p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>variant: {detailResult?.variant}</span>
              <span>latency: {detailResult?.latency_ms}ms</span>
              <span>quality: {detailResult?.quality_score}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
