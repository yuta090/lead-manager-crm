"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Settings,
  Mail,
  User,
  Server,
  FileUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { APP_VERSION } from "@/lib/format"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ImportLog, Genre } from "@/types/database"

function maskApiKey(key: string | undefined): string {
  if (!key) return "未設定"
  if (key.length <= 8) return "****"
  return key.slice(0, 3) + "****" + key.slice(-4)
}

export default function SettingsPage() {
  const supabase = createClient()

  // Staff settings
  const [staffName, setStaffName] = useState("")
  const [staffSaved, setStaffSaved] = useState(false)

  // Connection test
  const [testing, setTesting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<
    { ok: boolean; message: string } | null
  >(null)

  // Import history
  const [imports, setImports] = useState<(ImportLog & { genreName: string })[]>([])
  const [importsLoading, setImportsLoading] = useState(true)

  // Only expose Supabase URL (public) — secrets are NOT exposed to client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "未設定"

  // Load staff name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lm_staff_name")
    if (saved) setStaffName(saved)
  }, [])

  // Save staff name
  const handleSaveStaff = () => {
    localStorage.setItem("lm_staff_name", staffName)
    setStaffSaved(true)
    toast.success("担当者名を保存しました")
    setTimeout(() => setStaffSaved(false), 2000)
  }

  // Connection test
  const handleConnectionTest = async () => {
    setTesting(true)
    setConnectionResult(null)

    try {
      const start = Date.now()
      const { data, error } = await supabase
        .from("lm_genres")
        .select("id")
        .limit(1)

      const elapsed = Date.now() - start

      if (error) {
        setConnectionResult({
          ok: false,
          message: `接続エラー: ${error.message}`,
        })
      } else {
        setConnectionResult({
          ok: true,
          message: `接続成功 (${elapsed}ms)`,
        })
      }
    } catch (err) {
      setConnectionResult({
        ok: false,
        message: "接続に失敗しました",
      })
    }

    setTesting(false)
  }

  // Fetch import history
  const fetchImports = useCallback(async () => {
    setImportsLoading(true)

    const { data: logsData, error: logsError } = await supabase
      .from("lm_import_logs")
      .select("id, genre_id, filename, total_rows, imported_rows, skipped_rows, duplicate_rows, imported_at")
      .order("imported_at", { ascending: false })
      .limit(50)

    if (logsError) {
      toast.error("インポート履歴の取得に失敗しました")
      setImportsLoading(false)
      return
    }

    const logs = (logsData ?? []) as ImportLog[]

    // Batch fetch genre names
    const genreIds = [...new Set(logs.map((l) => l.genre_id))]
    const genreMap: Record<string, string> = {}

    if (genreIds.length > 0) {
      const { data: genresData } = await supabase
        .from("lm_genres")
        .select("id, name")
        .in("id", genreIds)

      for (const g of genresData ?? []) {
        genreMap[g.id] = g.name
      }
    }

    setImports(
      logs.map((l) => ({
        ...l,
        genreName: genreMap[l.genre_id] ?? "不明",
      }))
    )
    setImportsLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchImports()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground">
          システム設定・接続情報・インポート履歴
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              メール設定
            </CardTitle>
            <CardDescription>
              Resend APIの接続状態（環境変数で管理）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              メール配信の設定は環境変数（.env.local）で管理されています。
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">RESEND_API_KEY</span>
                <Badge variant="outline" className="gap-1">サーバー側で管理</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">FROM_EMAIL</span>
                <Badge variant="outline" className="gap-1">サーバー側で管理</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">RESEND_WEBHOOK_SECRET</span>
                <Badge variant="outline" className="gap-1">サーバー側で管理</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              担当者設定
            </CardTitle>
            <CardDescription>
              活動履歴の作成者として使用されます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">担当者名</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="staff-name"
                  placeholder="例: 田中太郎"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
                <Button onClick={handleSaveStaff} disabled={!staffName.trim()}>
                  {staffSaved ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : null}
                  保存
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ブラウザのローカルストレージに保存されます
            </p>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              システム情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Supabase URL
                </Label>
                <p className="break-all text-sm font-mono">{supabaseUrl}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  接続テスト
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectionTest}
                    disabled={testing}
                  >
                    {testing && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    テスト実行
                  </Button>
                  {connectionResult && (
                    <span
                      className={`text-sm ${
                        connectionResult.ok
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {connectionResult.message}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  アプリバージョン
                </Label>
                <p className="text-sm">Lead Manager v{APP_VERSION}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            インポート履歴
          </CardTitle>
          <CardDescription>
            CSVインポートの実行履歴
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : imports.length === 0 ? (
            <EmptyState
              title="インポート履歴がありません"
              description="企業リストをCSVでインポートすると履歴が表示されます"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>ジャンル</TableHead>
                  <TableHead>ファイル名</TableHead>
                  <TableHead className="text-right">総行数</TableHead>
                  <TableHead className="text-right">インポート</TableHead>
                  <TableHead className="text-right">スキップ</TableHead>
                  <TableHead className="text-right">重複</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(imp.imported_at).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{imp.genreName}</Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-xs">
                      {imp.filename}
                    </TableCell>
                    <TableCell className="text-right">
                      {imp.total_rows ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {imp.imported_rows ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {imp.skipped_rows ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {imp.duplicate_rows ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
