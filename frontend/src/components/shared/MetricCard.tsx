import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  valueClassName?: string
}

export default function MetricCard({ label, value, icon: Icon, trend, valueClassName }: Props) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="w-8" />
        <span className="flex-1 pt-1 text-center text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className={`flex-1 flex items-center justify-center text-4xl font-bold tracking-tight ${valueClassName || 'text-foreground'}`}>
        {value}
      </p>
      {trend && (
        <p className="text-center text-[11px] text-muted-foreground">{trend}</p>
      )}
    </div>
  )
}
