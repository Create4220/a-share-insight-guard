import type { ReviewStatus } from '../../types'

const statusConfig: Record<ReviewStatus, { label: string; className: string }> = {
  APPROVED: {
    label: '已通过',
    className:
      'bg-[hsl(110,12%,52%)]/10 text-[hsl(110,12%,52%)] border-[hsl(110,12%,52%)]/25',
  },
  NEEDS_REVISION: {
    label: '需修改',
    className:
      'bg-[hsl(38,35%,58%)]/10 text-[hsl(38,35%,58%)] border-[hsl(38,35%,58%)]/25',
  },
  NEEDS_MANUAL_REVIEW: {
    label: '待人工复核',
    className:
      'bg-[hsl(8,38%,58%)]/10 text-[hsl(8,38%,58%)] border-[hsl(8,38%,58%)]/25',
  },
  BLOCKED: {
    label: '已拦截',
    className:
      'bg-[hsl(0,85%,45%)]/10 text-[hsl(0,85%,45%)] border-[hsl(0,85%,45%)]/25',
  },
}

interface Props {
  status: ReviewStatus
  className?: string
}

export default function StatusBadge({ status, className = '' }: Props) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}
