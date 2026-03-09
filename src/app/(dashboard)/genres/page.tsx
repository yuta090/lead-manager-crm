"use client"

import { useEffect, useState, useCallback } from "react"
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Tag as TagIcon,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import type { Genre, Tag } from "@/types/database"

type GenreStats = {
  id: string
  name: string
  description: string | null
  companyCount: number
  withEmail: number
  engaged: number
  negotiating: number
  closed: number
  campaignCount: number
}

const TAG_COLORS = [
  { name: "ブルー", value: "#3B82F6" },
  { name: "グリーン", value: "#10B981" },
  { name: "イエロー", value: "#F59E0B" },
  { name: "レッド", value: "#EF4444" },
  { name: "パープル", value: "#8B5CF6" },
  { name: "オレンジ", value: "#F97316" },
  { name: "シアン", value: "#06B6D4" },
  { name: "ピンク", value: "#EC4899" },
]

export default function GenresPage() {
  const { genres, refresh } = useGenre()
  const supabase = createClient()

  const [genreStats, setGenreStats] = useState<GenreStats[]>([])
  const [loading, setLoading] = useState(true)

  // Add genre form
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [adding, setAdding] = useState(false)

  // Edit genre
  const [selectedGenreId, setSelectedGenreId] = useState<string>("")
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [saving, setSaving] = useState(false)

  // Tags
  const [tags, setTags] = useState<(Tag & { usageCount: number })[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].value)
  const [addingTag, setAddingTag] = useState(false)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  const [deletingTag, setDeletingTag] = useState(false)

  // Fetch genre statistics (bulk queries instead of per-genre loop)
  const fetchStats = useCallback(async () => {
    setLoading(true)
    const genreIds = genres.map((g) => g.id)

    const [companiesRes, campaignsRes] = await Promise.all([
      supabase
        .from("lm_companies")
        .select("genre_id, status, email")
        .in("genre_id", genreIds),
      supabase
        .from("lm_campaigns")
        .select("genre_id")
        .in("genre_id", genreIds),
    ])

    if (companiesRes.error || campaignsRes.error) {
      toast.error("ジャンル統計の取得に失敗しました")
      setLoading(false)
      return
    }

    const allCompanies = (companiesRes.data ?? []) as { genre_id: string; status: string; email: string | null }[]
    const allCampaigns = (campaignsRes.data ?? []) as { genre_id: string }[]

    // Group companies by genre_id
    const companiesByGenre = new Map<string, typeof allCompanies>()
    for (const c of allCompanies) {
      const arr = companiesByGenre.get(c.genre_id) ?? []
      arr.push(c)
      companiesByGenre.set(c.genre_id, arr)
    }

    // Count campaigns by genre_id
    const campaignCountByGenre = new Map<string, number>()
    for (const c of allCampaigns) {
      campaignCountByGenre.set(c.genre_id, (campaignCountByGenre.get(c.genre_id) ?? 0) + 1)
    }

    const statsArr: GenreStats[] = genres.map((genre) => {
      const companies = companiesByGenre.get(genre.id) ?? []
      const statusMap: Record<string, number> = {}
      for (const c of companies) {
        statusMap[c.status] = (statusMap[c.status] ?? 0) + 1
      }

      return {
        id: genre.id,
        name: genre.name,
        description: genre.description,
        companyCount: companies.length,
        withEmail: companies.filter((c) => c.email).length,
        engaged: statusMap["反応あり"] ?? 0,
        negotiating: statusMap["商談中"] ?? 0,
        closed: statusMap["成約"] ?? 0,
        campaignCount: campaignCountByGenre.get(genre.id) ?? 0,
      }
    })

    setGenreStats(statsArr)
    setLoading(false)
  }, [genres]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (genres.length > 0) {
      fetchStats()
    } else {
      setLoading(false)
    }
  }, [genres]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch tags for selected genre (batch usage count query)
  const fetchTags = useCallback(
    async (genreId: string) => {
      setTagsLoading(true)
      const { data: tagsData, error: tagsError } = await supabase
        .from("lm_tags")
        .select("id, genre_id, name, color, created_at")
        .eq("genre_id", genreId)
        .order("name")

      if (tagsError) {
        toast.error("タグの取得に失敗しました")
        setTagsLoading(false)
        return
      }

      const tagsList = (tagsData ?? []) as Tag[]

      if (tagsList.length === 0) {
        setTags([])
        setTagsLoading(false)
        return
      }

      // Batch-fetch tag usage counts
      const tagIds = tagsList.map((t) => t.id)
      const { data: tagUsage } = await supabase
        .from("lm_company_tags")
        .select("tag_id")
        .in("tag_id", tagIds)

      // Count client-side
      const usageCountMap = new Map<string, number>()
      for (const row of tagUsage ?? []) {
        usageCountMap.set(row.tag_id, (usageCountMap.get(row.tag_id) ?? 0) + 1)
      }

      const tagsWithCounts: (Tag & { usageCount: number })[] = tagsList.map(
        (tag) => ({ ...tag, usageCount: usageCountMap.get(tag.id) ?? 0 })
      )

      setTags(tagsWithCounts)
      setTagsLoading(false)
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // When selected genre changes, update edit form and fetch tags
  useEffect(() => {
    if (selectedGenreId) {
      const genre = genres.find((g) => g.id === selectedGenreId)
      if (genre) {
        setEditName(genre.name)
        setEditDesc(genre.description ?? "")
        fetchTags(selectedGenreId)
      }
    } else {
      setTags([])
    }
  }, [selectedGenreId, genres]) // eslint-disable-line react-hooks/exhaustive-deps

  // Add genre
  const handleAddGenre = async () => {
    if (!newName.trim()) return
    setAdding(true)

    const { error } = await supabase.from("lm_genres").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
    })

    if (error) {
      if (error.code === "23505") {
        toast.error("同名のジャンルが既に存在します")
      } else {
        toast.error("ジャンルの追加に失敗しました")
      }
      setAdding(false)
      return
    }

    toast.success("ジャンルを追加しました")
    setNewName("")
    setNewDesc("")
    setAdding(false)
    await refresh()
  }

  // Update genre
  const handleUpdateGenre = async () => {
    if (!selectedGenreId || !editName.trim()) return
    setSaving(true)

    const { error } = await supabase
      .from("lm_genres")
      .update({
        name: editName.trim(),
        description: editDesc.trim() || null,
      })
      .eq("id", selectedGenreId)

    if (error) {
      if (error.code === "23505") {
        toast.error("同名のジャンルが既に存在します")
      } else {
        toast.error("ジャンルの更新に失敗しました")
      }
      setSaving(false)
      return
    }

    toast.success("ジャンルを更新しました")
    setSaving(false)
    await refresh()
  }

  // Add tag
  const handleAddTag = async () => {
    if (!selectedGenreId || !newTagName.trim()) return
    setAddingTag(true)

    const { error } = await supabase.from("lm_tags").insert({
      genre_id: selectedGenreId,
      name: newTagName.trim(),
      color: newTagColor,
    })

    if (error) {
      toast.error("タグの追加に失敗しました")
      setAddingTag(false)
      return
    }

    toast.success("タグを追加しました")
    setNewTagName("")
    setNewTagColor(TAG_COLORS[0].value)
    setAddingTag(false)
    await fetchTags(selectedGenreId)
  }

  // Delete tag
  const handleDeleteTag = async () => {
    if (!deleteTagId || !selectedGenreId) return
    setDeletingTag(true)

    const { error } = await supabase
      .from("lm_tags")
      .delete()
      .eq("id", deleteTagId)

    if (error) {
      toast.error("タグの削除に失敗しました")
      setDeletingTag(false)
      return
    }

    toast.success("タグを削除しました")
    setDeleteTagId(null)
    setDeletingTag(false)
    await fetchTags(selectedGenreId)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">ジャンル管理</h1>
        <p className="text-sm text-muted-foreground">
          ジャンルの追加・編集・タグ管理
        </p>
      </div>

      {/* Genre List Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            ジャンル一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : genreStats.length === 0 ? (
            <EmptyState
              title="ジャンルがありません"
              description="下のフォームからジャンルを追加してください"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ジャンル名</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead className="text-right">企業数</TableHead>
                  <TableHead className="text-right">メールあり</TableHead>
                  <TableHead className="text-right">反応あり</TableHead>
                  <TableHead className="text-right">商談中</TableHead>
                  <TableHead className="text-right">成約</TableHead>
                  <TableHead className="text-right">キャンペーン数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {genreStats.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{g.companyCount}</TableCell>
                    <TableCell className="text-right">{g.withEmail}</TableCell>
                    <TableCell className="text-right">{g.engaged}</TableCell>
                    <TableCell className="text-right">{g.negotiating}</TableCell>
                    <TableCell className="text-right">{g.closed}</TableCell>
                    <TableCell className="text-right">
                      {g.campaignCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Genre Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            ジャンル追加
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-genre-name">ジャンル名 *</Label>
              <Input
                id="new-genre-name"
                placeholder="例: 不動産会社"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-genre-desc">説明</Label>
              <Input
                id="new-genre-desc"
                placeholder="任意"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddGenre}
              disabled={adding || !newName.trim()}
            >
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Edit Genre & Tag Management */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Edit Genre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              ジャンル編集
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ジャンル選択</Label>
              <Select
                value={selectedGenreId}
                onValueChange={(val) => { if (val != null) setSelectedGenreId(String(val)) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="編集するジャンルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGenreId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-genre-name">ジャンル名 *</Label>
                  <Input
                    id="edit-genre-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-genre-desc">説明</Label>
                  <Input
                    id="edit-genre-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleUpdateGenre}
                  disabled={saving || !editName.trim()}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  更新
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tag Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              タグ管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedGenreId ? (
              <p className="text-sm text-muted-foreground">
                左のセレクターからジャンルを選択してください
              </p>
            ) : tagsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Existing Tags */}
                <div className="space-y-2">
                  <Label>登録済みタグ</Label>
                  {tags.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      タグがありません
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <div
                          key={tag.id}
                          className="group/tag flex items-center gap-1"
                        >
                          <Badge
                            variant="outline"
                            className="gap-1.5"
                            style={{
                              borderColor: tag.color,
                              color: tag.color,
                              backgroundColor: `${tag.color}10`,
                            }}
                          >
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                            <span className="text-muted-foreground">
                              ({tag.usageCount})
                            </span>
                          </Badge>
                          <Dialog
                            open={deleteTagId === tag.id}
                            onOpenChange={(open) =>
                              setDeleteTagId(open ? tag.id : null)
                            }
                          >
                            <DialogTrigger
                              render={
                                <button
                                  className="hidden rounded p-0.5 text-muted-foreground hover:text-destructive group-hover/tag:inline-flex"
                                />
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>タグを削除</DialogTitle>
                                <DialogDescription>
                                  タグ「{tag.name}」を削除しますか？
                                  {tag.usageCount > 0 &&
                                    `（${tag.usageCount}社で使用中）`}
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose
                                  render={<Button variant="outline" />}
                                >
                                  キャンセル
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  onClick={handleDeleteTag}
                                  disabled={deletingTag}
                                >
                                  {deletingTag && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  )}
                                  削除する
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Add Tag Form */}
                <div className="space-y-3">
                  <Label>タグ追加</Label>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="new-tag-name" className="text-xs text-muted-foreground">
                        タグ名
                      </Label>
                      <Input
                        id="new-tag-name"
                        placeholder="例: VIP"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">カラー</Label>
                      <div className="flex gap-1">
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setNewTagColor(color.value)}
                            className="h-7 w-7 rounded-md border-2 transition-all"
                            style={{
                              backgroundColor: color.value,
                              borderColor:
                                newTagColor === color.value
                                  ? color.value
                                  : "transparent",
                              opacity:
                                newTagColor === color.value ? 1 : 0.5,
                            }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddTag}
                    disabled={addingTag || !newTagName.trim()}
                  >
                    {addingTag && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    タグ追加
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
