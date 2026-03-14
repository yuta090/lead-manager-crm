"use client"

import { Suspense, useEffect, useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useGenre } from "@/components/layout/genre-provider"
import { EmptyState } from "@/components/empty-state"
import { LoadingSpinner } from "@/components/loading-spinner"
import { DataTable } from "@/components/companies/data-table"
import { columns } from "@/components/companies/columns"
import type { Company } from "@/types/database"

export default function CompaniesPage() {
  const { currentGenre, loading: genreLoading } = useGenre()
  const supabase = createClient()
  const requestIdRef = useRef(0)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCompanies = useCallback(async () => {
    if (!currentGenre) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    const { data, error } = await supabase
      .from("lm_companies")
      .select("id, name, status, email, phone, prefecture, priority, address, website, created_at")
      .eq("genre_id", currentGenre.id)
      .order("created_at", { ascending: false })

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
        <h1 className="text-2xl font-bold tracking-tight">企業一覧</h1>
        <p className="text-sm text-muted-foreground">
          {currentGenre.name} の企業リスト
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <DataTable columns={columns} data={companies} loading={loading} onCompanyAdded={fetchCompanies} />
      </Suspense>
    </div>
  )
}
