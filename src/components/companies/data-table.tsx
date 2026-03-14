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
  const isSyncingFromUrl = useRef(false)
  const isInitialMount = useRef(true)
  // Track the last query string we pushed to prevent infinite loops
  const lastPushedQs = useRef(searchParams.toString())

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

  // Refs to track latest state for URL building
  const globalFilterRef = useRef(globalFilter)
  const emailOnlyRef = useRef(emailOnly)
  const columnFiltersRef = useRef(columnFilters)
  globalFilterRef.current = globalFilter
  emailOnlyRef.current = emailOnly
  columnFiltersRef.current = columnFilters

  // Fix #3: Build URL from current state values instead of stale searchParams.
  // Compares against lastPushedQs ref to skip no-op updates and avoid loops.
  const syncUrlFromState = useCallback((
    q: string,
    hasEmail: boolean,
    filters: ColumnFiltersState
  ) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (hasEmail) params.set("hasEmail", "1")
    const statusFilter = filters.find((f) => f.id === "status")
    const statuses = statusFilter?.value as string[] | undefined
    if (statuses && statuses.length > 0) params.set("status", statuses.join(","))
    const newQs = params.toString()

    // Skip if URL would not change
    if (newQs === lastPushedQs.current) return

    lastPushedQs.current = newQs
    router.replace(newQs ? `/companies?${newQs}` : "/companies", { scroll: false })
  }, [router])

  // Fix #4: Sync URL -> state on browser back/forward
  useEffect(() => {
    // Skip initial mount — state is already initialized from URL
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const currentQs = searchParams.toString()
    // If the URL matches what we last pushed, this is our own update — skip
    if (currentQs === lastPushedQs.current) return

    const q = searchParams.get("q") || ""
    const hasEmail = searchParams.get("hasEmail") === "1"
    const status = searchParams.get("status")

    isSyncingFromUrl.current = true
    lastPushedQs.current = currentQs

    setGlobalFilter(q)
    setEmailOnly(hasEmail)
    if (status) {
      setColumnFilters([{ id: "status", value: status.split(",") }])
    } else {
      setColumnFilters([])
    }

    // Reset flag after React processes the state updates
    Promise.resolve().then(() => {
      isSyncingFromUrl.current = false
    })
  }, [searchParams])

  // Wrap setGlobalFilter with URL sync (debounced)
  const handleGlobalFilterChange = useCallback((value: string) => {
    setGlobalFilter(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!isSyncingFromUrl.current) {
        syncUrlFromState(value, emailOnlyRef.current, columnFiltersRef.current)
      }
    }, 300)
  }, [syncUrlFromState])

  // Wrap setEmailOnly with URL sync
  const handleEmailOnlyChange = useCallback((value: boolean) => {
    setEmailOnly(value)
    if (!isSyncingFromUrl.current) {
      syncUrlFromState(globalFilterRef.current, value, columnFiltersRef.current)
    }
  }, [syncUrlFromState])

  // Fix #5: Column filter changes — pure state updater without side effects
  const handleColumnFiltersChange = useCallback((updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
    setColumnFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      return next
    })
  }, [])

  // Fix #5: Sync column filter state changes to URL via useEffect
  useEffect(() => {
    if (isSyncingFromUrl.current) return
    syncUrlFromState(globalFilterRef.current, emailOnlyRef.current, columnFilters)
  }, [columnFilters, syncUrlFromState])

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
