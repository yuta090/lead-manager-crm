"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import { EmptyState } from "@/components/empty-state"
import { DataTable } from "@/components/companies/data-table"
import { columns } from "@/components/companies/columns"
import type { Company } from "@/types/database"

export default function CompaniesPage() {
  const { currentGenre, loading: genreLoading } = useGenre()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentGenre) return
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from("lm_companies")
        .select("*")
        .eq("genre_id", currentGenre.id)
        .order("created_at", { ascending: false })

      setCompanies((data as Company[]) ?? [])
      setLoading(false)
    })()
  }, [currentGenre])

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">企業一覧</h1>
        <p className="text-sm text-muted-foreground">
          {currentGenre.name} の企業リスト
        </p>
      </div>

      <DataTable columns={columns} data={companies} loading={loading} />
    </div>
  )
}
