"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { PromptVersion } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
  renderPrompt,
  extractPlaceholders,
  PREVIEW_INTEL,
  PREVIEW_SENDER,
} from "@/lib/prompt-renderer"
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  Save,
  Star,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [version, setVersion] = useState<PromptVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // フォーム状態
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [userTemplate, setUserTemplate] = useState("")
  const [modelDefault, setModelDefault] = useState("gpt-4o-mini")
  const [providerDefault, setProviderDefault] = useState("openai")
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(500)

  const fetchVersion = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("lm_prompt_versions")
      .select("*")
      .eq("id", id)
      .single()
    if (error || !data) {
      toast.error("プロンプトが見つかりません")
      router.push("/prompts")
      return
    }
    const v = data as PromptVersion
    setVersion(v)
    setName(v.name)
    setDescription(v.description ?? "")
    setSystemPrompt(v.system_prompt)
    setUserTemplate(v.user_prompt_template)
    setModelDefault(v.model_default)
    setProviderDefault(v.provider_default)
    setTemperature(v.temperature)
    setMaxTokens(v.max_tokens)
    setLoading(false)
  }, [id, supabase, router])

  const fetchStats = useCallback(async () => {
    const res = await fetch(`/api/prompts/${id}/stats`)
    if (res.ok) setStats(await res.json())
  }, [id])

  useEffect(() => {
    fetchVersion()
    fetchStats()
  }, [fetchVersion, fetchStats])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from("lm_prompt_versions")
      .update({
        name,
        description: description || null,
        system_prompt: systemPrompt,
        user_prompt_template: userTemplate,
        model_default: modelDefault,
        provider_default: providerDefault,
        temperature,
        max_tokens: maxTokens,
      })
      .eq("id", id)
    setSaving(false)
    if (error) {
      toast.error(`保存失敗: ${error.message}`)
      return
    }
    toast.success("保存しました")
    fetchVersion()
  }

  const handleActivate = async () => {
    const res = await fetch(`/api/prompts/${id}/activate`, { method: "POST" })
    if (!res.ok) {
      toast.error("アクティブ化に失敗しました")
      return
    }
    toast.success("本番プロンプトに設定しました")
    fetchVersion()
  }

  if (loading) return <LoadingSpinner />
  if (!version) return null

  const previewText = renderPrompt(userTemplate, PREVIEW_INTEL, PREVIEW_SENDER)
  const placeholders = extractPlaceholders(userTemplate)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{version.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {version.is_active && (
                <Badge variant="default"><Star className="mr-1 h-3 w-3" /> 本番</Badge>
              )}
              <Badge variant="outline">{version.provider_default}</Badge>
              <Badge variant="outline">{version.model_default}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/prompts/${id}/test`}>
              <FlaskConical className="mr-2 h-4 w-4" /> テスト実行
            </Link>
          </Button>
          {!version.is_active && (
            <Button variant="outline" onClick={handleActivate}>
              <Star className="mr-2 h-4 w-4" /> 本番に設定
            </Button>
          )}
        </div>
      </div>

      {/* パフォーマンスカード */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">生成数</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total_generations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">パーソナライズ率</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.personalized_rate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">平均レイテンシ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avg_latency_ms}ms</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">送信数</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total_submissions}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 編集フォーム */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>名前</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>説明</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>プロバイダー</Label>
              <Select value={providerDefault} onValueChange={setProviderDefault}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>モデル</Label>
              <Input value={modelDefault} onChange={(e) => setModelDefault(e.target.value)} />
            </div>
            <div>
              <Label>Temperature</Label>
              <Input
                type="number" step="0.1" min="0" max="1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
              />
            </div>
          </div>
          <div>
            <Label>システムプロンプト</Label>
            <Textarea
              className="font-mono text-sm min-h-[120px]"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
          <div>
            <Label>ユーザープロンプトテンプレート</Label>
            <p className="text-xs text-muted-foreground mb-1">
              変数: {placeholders.map((p) => `{{${p}}}`).join(", ") || "なし"}
            </p>
            <Textarea
              className="font-mono text-sm min-h-[300px]"
              value={userTemplate}
              onChange={(e) => setUserTemplate(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存
          </Button>
        </div>

        {/* プレビュー */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>プレビュー（ダミーデータ）</Label>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? "閉じる" : "展開結果を表示"}
            </Button>
          </div>
          {showPreview && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-2">システムプロンプト:</p>
                <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap mb-4">
                  {systemPrompt}
                </pre>
                <p className="text-xs text-muted-foreground mb-2">展開後ユーザープロンプト:</p>
                <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {previewText}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
