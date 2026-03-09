import { InboxIcon } from "lucide-react"

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <InboxIcon className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground/70">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
