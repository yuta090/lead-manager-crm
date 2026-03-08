"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import type { Company } from "@/types/database"
import { formatDate } from "@/lib/format"
import { StatusBadge, PriorityDot } from "@/components/status-badge"
import { Button } from "@/components/ui/button"

function SortableHeader({
  column,
  label,
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" }
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 font-medium"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
    </Button>
  )
}

export const columns: ColumnDef<Company>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="会社名" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <PriorityDot priority={row.original.priority} />
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} label="ステータス" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    filterFn: (row, id, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true
      return filterValue.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "email",
    header: "メール",
    cell: ({ row }) => {
      const email = row.getValue("email") as string | null
      return email ? (
        <span className="text-sm">{email}</span>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "電話番号",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string | null
      return phone ? (
        <span className="text-sm">{phone}</span>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      )
    },
  },
  {
    accessorKey: "prefecture",
    header: ({ column }) => <SortableHeader column={column} label="都道府県" />,
    cell: ({ row }) => {
      const pref = row.getValue("prefecture") as string | null
      return pref ? (
        <span className="text-sm">{pref}</span>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      )
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <SortableHeader column={column} label="優先度" />,
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string
      return (
        <div className="flex items-center gap-1.5">
          <PriorityDot priority={priority} />
          <span className="text-sm">{priority}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortableHeader column={column} label="登録日" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.getValue("created_at"))}
      </span>
    ),
  },
]
