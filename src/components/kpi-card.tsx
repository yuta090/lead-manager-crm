import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type KpiCardProps = {
  label: string
  value: string | number
  color?: string
  icon?: React.ReactNode
  href?: string
}

function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return value.toLocaleString("ja-JP")
  }
  return value
}

export function KpiCard({ label, value, color, icon, href }: KpiCardProps) {
  const card = (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-md",
        href && "cursor-pointer hover:border-primary/30"
      )}
    >
      {/* Bottom accent border */}
      {color && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
          }}
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

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {card}
      </Link>
    )
  }

  return card
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  )
}
