import { STATUS_CONFIG, type CompanyStatus } from "@/types/database"
import { cn } from "@/lib/utils"

export function StatusBadge({ status }: { status: CompanyStatus }) {
  const config = STATUS_CONFIG[status]
  if (!config) return <span>{status}</span>

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.dot }}
      />
      {config.label}
    </span>
  )
}

export function PriorityDot({ priority }: { priority: string }) {
  if (priority !== "高") return null
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-red-500"
      title="高優先度"
    />
  )
}
