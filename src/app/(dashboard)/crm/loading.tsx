import { Skeleton } from "@/components/ui/skeleton"

export default function CrmLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Tab bar */}
      <Skeleton className="h-10 w-80 rounded-lg" />

      {/* 5-column pipeline grid */}
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, col) => (
          <div key={col} className="space-y-2 rounded-lg bg-muted/30 p-2">
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            {/* Cards */}
            {[...Array(3)].map((_, row) => (
              <Skeleton key={row} className="h-16 rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
