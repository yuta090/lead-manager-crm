"use client"

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
  type ColumnDef,
} from "@tanstack/react-table"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import type { Company } from "@/types/database"
import { DataTableToolbar } from "./data-table-toolbar"

interface DataTableProps {
  columns: ColumnDef<Company, unknown>[]
  data: Company[]
  loading: boolean
}

export function DataTable({ columns, data, loading }: DataTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Read initial values from URL
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    const statusParam = searchParams.get("status")
    if (statusParam) {
      return [{ id: "status", value: statusParam.split(",") }]
    }
    return []
  })
  const [globalFilter, setGlobalFilter] = useState(() => searchParams.get("q") || "")
  const [emailOnly, setEmailOnly] = useState(() => searchParams.get("hasEmail") === "1")

  // URL sync helper
  const updateUrl = useCallback((params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) newParams.delete(key)
      else newParams.set(key, value)
    })
    const qs = newParams.toString()
    router.replace(qs ? `/companies?${qs}` : "/companies", { scroll: false })
  }, [searchParams, router])

  // Wrap setGlobalFilter with URL sync (debounced)
  const handleGlobalFilterChange = useCallback((value: string) => {
    setGlobalFilter(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateUrl({ q: value || null })
    }, 300)
  }, [updateUrl])

  // Wrap setEmailOnly with URL sync
  const handleEmailOnlyChange = useCallback((value: boolean) => {
    setEmailOnly(value)
    updateUrl({ hasEmail: value ? "1" : null })
  }, [updateUrl])

  // Sync column filter changes (status) to URL
  const handleColumnFiltersChange = useCallback((updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
    setColumnFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      const statusFilter = next.find((f) => f.id === "status")
      const statusValues = statusFilter?.value as string[] | undefined
      // Use setTimeout to batch the URL update outside of the render cycle
      setTimeout(() => {
        updateUrl({
          status: statusValues && statusValues.length > 0 ? statusValues.join(",") : null,
        })
      }, 0)
      return next
    })
  }, [updateUrl])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const filteredData = useMemo(
    () => emailOnly ? data.filter((c) => c.email) : data,
    [data, emailOnly]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase()
      const fields = ["name", "email", "phone", "address", "prefecture", "website"] as const
      return fields.some((field) => {
        const value = row.original[field]
        return value ? value.toLowerCase().includes(search) : false
      })
    },
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        setGlobalFilter={handleGlobalFilterChange}
        emailOnly={emailOnly}
        setEmailOnly={handleEmailOnlyChange}
        data={filteredData}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => router.push(`/crm?tab=detail&company=${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    title="企業が見つかりません"
                    description="フィルター条件を変更するか、CSVインポートで企業を追加してください"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} 件表示
        {emailOnly && " (メールありのみ)"}
      </div>
    </div>
  )
}
