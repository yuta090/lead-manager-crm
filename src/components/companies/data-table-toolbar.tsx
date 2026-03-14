"use client"

import { useRef } from "react"
import type { Table as TanstackTable } from "@tanstack/react-table"
import {
  Search,
  Upload,
  Download,
  Building2,
  ChevronDown,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import type { Company, CompanyStatus } from "@/types/database"
import { STATUS_ORDER, STATUS_CONFIG } from "@/types/database"

interface DataTableToolbarProps {
  table: TanstackTable<Company>
  globalFilter: string
  setGlobalFilter: (value: string) => void
  emailOnly: boolean
  setEmailOnly: (value: boolean) => void
  data: Company[]
}

function StatusFilterPopover({
  table,
}: {
  table: TanstackTable<Company>
}) {
  const column = table.getColumn("status")
  const filterValue = (column?.getFilterValue() as string[] | undefined) ?? []

  const toggle = (status: CompanyStatus) => {
    const next = filterValue.includes(status)
      ? filterValue.filter((s) => s !== status)
      : [...filterValue, status]
    column?.setFilterValue(next.length > 0 ? next : undefined)
  }

  const clear = () => {
    column?.setFilterValue(undefined)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8" />
        }
      >
        <span
          className="inline-block h-2 w-2 rounded-full bg-current"
          style={{
            color:
              filterValue.length > 0
                ? STATUS_CONFIG[filterValue[0] as CompanyStatus]?.dot ?? "currentColor"
                : "currentColor",
          }}
        />
        ステータス
        {filterValue.length > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            {filterValue.length}
          </span>
        )}
        <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        <div className="space-y-1">
          {STATUS_ORDER.map((status) => {
            const config = STATUS_CONFIG[status]
            const checked = filterValue.includes(status)
            return (
              <button
                key={status}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => toggle(status)}
              >
                <Checkbox checked={checked} tabIndex={-1} />
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: config.dot }}
                />
                {config.label}
              </button>
            )
          })}
        </div>
        {filterValue.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              onClick={clear}
            >
              <X className="h-3 w-3" />
              フィルター解除
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function CsvImportDialog() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-8" />
        }
      >
        <Upload className="h-3.5 w-3.5" />
        CSVインポート
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>CSVインポート</DialogTitle>
          <DialogDescription>
            CSV ファイルから企業データをインポートします。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border-2 border-dashed p-6 text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              CSVファイルを選択してください
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="mt-3 mx-auto max-w-[200px]"
            />
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Coming Soon
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              CSVインポート機能は現在開発中です。次のアップデートでご利用いただけます。
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            閉じる
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function downloadCsv(data: Company[]) {
  const headers = [
    "会社名",
    "ステータス",
    "メール",
    "電話番号",
    "都道府県",
    "優先度",
    "住所",
    "ウェブサイト",
    "登録日",
  ]

  const rows = data.map((c) => [
    c.name,
    c.status,
    c.email ?? "",
    c.phone ?? "",
    c.prefecture ?? "",
    c.priority,
    c.address ?? "",
    c.website ?? "",
    c.created_at ? new Date(c.created_at).toISOString().split("T")[0] : "",
  ])

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n")

  const bom = "\uFEFF"
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `企業リスト_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function DataTableToolbar({
  table,
  globalFilter,
  setGlobalFilter,
  emailOnly,
  setEmailOnly,
  data,
}: DataTableToolbarProps) {
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="会社名・メール・電話で検索..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>

        <StatusFilterPopover table={table} />

        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={emailOnly}
            onCheckedChange={(checked) => setEmailOnly(checked === true)}
          />
          メールあり
        </label>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span>{filteredCount} 社</span>
        </div>

        <CsvImportDialog />

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            const rows = table.getFilteredRowModel().rows
            downloadCsv(rows.map((r) => r.original))
          }}
        >
          <Download className="h-3.5 w-3.5" />
          CSVエクスポート
        </Button>
      </div>
    </div>
  )
}
