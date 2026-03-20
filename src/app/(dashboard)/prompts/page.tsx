"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import type { PromptVersion } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { EmptyState } from "@/components/empty-state"
import {
  Plus,
  Loader2,
  Star,
  FlaskConical,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

const DEFAULT_SYSTEM_PROMPT = `あなたは不動産業界向けB2B営業メッセージの専門ライターです。
丁寧な「です・ます」調で、押し売り感のない自然なトーンで書いてください。
必ず指定されたJSON形式で出力してください。`

const DEFAULT_USER_TEMPLATE = `## 企業情報
- 社名: {{company_name}}
- 事業分野: {{business_types}}
- 対象エリア: {{target_areas}}
- 代表者: {{ceo_name}}
- 企業理念の要旨: {{philosophy}}
- 注目情報: {{notable_info}}

## 送信者情報
- 会社名: {{sender_company}}
- 担当者: {{sender_name}}

## 想定されるペインポイント
- {{pain_point}}

## 出力形式（JSON）
{"件名": "30文字以内の件名", "パーソナライズ本文": "100-200文字の本文"}

## ルール
- 挨拶（お世話になっております）・署名は不要（別途テンプレートで付与）
- 御社の事業分野への具体的言及を必ず含める（エリア情報がある場合はエリアも言及）
- 課題仮説を1つ提示し、ソリューションを簡潔に述べる
- 「です・ます」調で統一
- 過度な修飾語やカタカナビジネス用語の多用を避ける`

type FormData = {
  name: string
  description: string
  system_prompt: string
  user_prompt_template: string
  model_default: string
  provider_default: string
  temperature: number
  max_tokens: number
}

const emptyForm: FormData = {
  name: "",
  description: "",
  system_prompt: "",
  user_prompt_template: "",
  model_default: "gpt-4o-mini",
  provider_default: "openai",
  temperature: 0.7,
  max_tokens: 500,
}

export default function PromptsPage() {
  const { currentGenre, loading: genreLoading } = useGenre()
  const supabase = createClient()
  const reqRef = useRef(0)

  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVersions = useCallback(async () => {
    if (!currentGenre) return
    const rid = ++reqRef.current
    setLoading(true)
    const { data, error } = await supabase
      .from("lm_prompt_versions")
      .select("*")
      .eq("genre_id", currentGenre.id)
      .order("created_at", { ascending: false })
    if (reqRef.current !== rid) return
    if (error) {
      toast.error("取得に失敗しました")
      setLoading(false)
      return
    }
    setVersions((data as PromptVersion[]) ?? [])
    setLoading(false)
  }, [currentGenre, supabase])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const handleCreate = async () => {
    if (!currentGenre || !form.name || !form.system_prompt || !form.user_prompt_template) {
      toast.error("名前、システムプロンプト、ユーザーテンプレートは必須です")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("lm_prompt_versions").insert({
      genre_id: currentGenre.id,
      ...form,
    })
    setSaving(false)
    if (error) {
      toast.error(`作成失敗: ${error.message}`)
      return
    }
    toast.success("プロンプトを作成しました")
    setShowCreate(false)
    setForm(emptyForm)
    fetchVersions()
  }

  const handleActivate = async (id: string) => {
    const res = await fetch(`/api/prompts/${id}/activate`, { method: "POST" })
    if (!res.ok) {
      toast.error("アクティブ化に失敗しました")
      return
    }
    toast.success("本番プロンプトに設定しました")
    fetchVersions()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase
      .from("lm_prompt_versions")
      .delete()
      .eq("id", deleteTarget)
    setDeleting(false)
    if (error) {
      toast.error(`削除失敗: ${error.message}`)
      return
    }
    toast.success("削除しました")
    setDeleteTarget(null)
    fetchVersions()
  }

  const seedFromDefault = () => {
    setForm({
      ...emptyForm,
      name: "v0-デフォルト",
      description: "ハードコード版プロンプトから生成",
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      user_prompt_template: DEFAULT_USER_TEMPLATE,
    })
    setShowCreate(true)
  }

  if (genreLoading) return <LoadingSpinner />
  if (!currentGenre) {
    return <EmptyState title="ジャンルを選択してください" description="サイドバーからジャンルを選択してください" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">プロンプト管理</h1>
          <p className="text-sm text-muted-foreground">
            {currentGenre.name} のメッセージ生成プロンプト
          </p>
        </div>
        <div className="flex gap-2">
          {versions.length === 0 && (
            <Button variant="outline" onClick={seedFromDefault}>
              <Sparkles className="mr-2 h-4 w-4" />
              デフォルトから作成
            </Button>
          )}
          <Button onClick={() => { setForm(emptyForm); setShowCreate(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : versions.length === 0 ? (
        <EmptyState
          title="プロンプトがありません"
          description="「デフォルトから作成」で現在のハードコードプロンプトをインポートできます"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {versions.map((v) => (
            <Card key={v.id} className={v.is_active ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{v.name}</CardTitle>
                  {v.is_active && (
                    <Badge variant="default" className="text-xs">
                      <Star className="mr-1 h-3 w-3" /> 本番
                    </Badge>
                  )}
                </div>
                {v.description && (
                  <CardDescription className="text-xs">
                    {v.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{v.provider_default}</Badge>
                  <Badge variant="outline">{v.model_default}</Badge>
                  <span>temp: {v.temperature}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/prompts/${v.id}`}>
                      <Pencil className="mr-1 h-3 w-3" /> 編集
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/prompts/${v.id}/test`}>
                      <FlaskConical className="mr-1 h-3 w-3" /> テスト
                    </Link>
                  </Button>
                  {!v.is_active && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(v.id)}
                      >
                        <Star className="mr-1 h-3 w-3" /> 本番に設定
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(v.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 作成ダイアログ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>プロンプトバージョン作成</DialogTitle>
            <DialogDescription>
              メッセージ生成に使用するプロンプトテンプレートを定義します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>名前 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="v1-基本"
                />
              </div>
              <div>
                <Label>説明</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="初期バージョン"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>プロバイダー</Label>
                <Select
                  value={form.provider_default}
                  onValueChange={(v) => setForm({ ...form, provider_default: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>モデル</Label>
                <Input
                  value={form.model_default}
                  onChange={(e) => setForm({ ...form, model_default: e.target.value })}
                />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0.7 })}
                />
              </div>
            </div>
            <div>
              <Label>システムプロンプト *</Label>
              <Textarea
                className="font-mono text-sm min-h-[100px]"
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                placeholder="あなたは不動産業界向け..."
              />
            </div>
            <div>
              <Label>ユーザープロンプトテンプレート *</Label>
              <p className="text-xs text-muted-foreground mb-1">
                {"利用可能変数: {{company_name}}, {{business_types}}, {{target_areas}}, {{ceo_name}}, {{philosophy}}, {{pain_point}}, {{sender_company}}, {{sender_name}}"}
              </p>
              <Textarea
                className="font-mono text-sm min-h-[250px]"
                value={form.user_prompt_template}
                onChange={(e) => setForm({ ...form, user_prompt_template: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プロンプトを削除</DialogTitle>
            <DialogDescription>
              このバージョンを削除してよろしいですか？生成ログも削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
