import { Loader2 } from "lucide-react"

export function LoadingSpinner({ message = "読み込み中..." }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
