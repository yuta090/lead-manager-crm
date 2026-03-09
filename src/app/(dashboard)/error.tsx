"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-lg font-semibold">エラーが発生しました</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {error.message || "予期しないエラーが発生しました"}
      </p>
      <Button onClick={reset}>再試行</Button>
    </div>
  )
}
