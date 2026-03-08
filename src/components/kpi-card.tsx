import { Card, CardContent } from "@/components/ui/card"

type KpiCardProps = {
  label: string
  value: string | number
  color?: string
  icon?: React.ReactNode
}

export function KpiCard({ label, value, color, icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: color ? `${color}15` : undefined }}
          >
            {icon}
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  )
}
