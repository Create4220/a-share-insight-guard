import { Inbox, type LucideIcon } from 'lucide-react'

interface Props {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}

export default function EmptyState({ title, description, icon: Icon, action }: Props) {
  const IconComponent = Icon || Inbox

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-[var(--color-surface-raised)] p-4 mb-4">
        <IconComponent className="h-8 w-8 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-base font-medium text-[var(--color-text-primary)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
