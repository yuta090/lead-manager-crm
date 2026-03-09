import { Card, CardContent } from "@/components/ui/card"

type KpiCardProps = {
  label: string
  value: string | number
  color?: string
  icon?: React.ReactNode
}

function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return value.toLocaleString("ja-JP")
  }
  return value
}

export function KpiCard({ label, value, color, icon }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* Bottom accent border */}
      {color && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      )}
      <CardContent className="flex items-center gap-3 p-4">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: color
                ? `linear-gradient(135deg, ${color}18, ${color}08)`
                : undefined,
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight" style={{ color }}>
            {formatValue(value)}
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
