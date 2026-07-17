import type { RiskLevel } from '../../types'

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  LOW: {
    label: '低风险',
    className:
      'bg-[hsl(210,25%,55%)]/10 text-[hsl(210,25%,55%)] border-[hsl(210,25%,55%)]/25',
  },
  MEDIUM: {
    label: '中风险',
    className:
      'bg-[hsl(210,100%,55%)]/10 text-[hsl(210,100%,55%)] border-[hsl(210,100%,55%)]/25',
  },
  HIGH: {
    label: '高风险',
    className:
      'bg-[hsl(45,90%,40%)]/10 text-[hsl(45,90%,40%)] border-[hsl(45,90%,40%)]/25',
  },
  CRITICAL: {
    label: '严重风险',
    className:
      'bg-[hsl(0,85%,45%)]/10 text-[hsl(0,85%,45%)] border-[hsl(0,85%,45%)]/25',
  },
}

interface Props {
  level: RiskLevel
  className?: string
}

export default function RiskBadge({ level, className = '' }: Props) {
  const config = riskConfig[level]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}
