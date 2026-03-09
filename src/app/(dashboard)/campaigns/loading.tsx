import { Skeleton } from "@/components/ui/skeleton"

export default function CampaignsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-96 rounded-lg" />

      {/* Content area */}
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  )
}
