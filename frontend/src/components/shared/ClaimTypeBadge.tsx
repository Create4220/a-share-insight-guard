import type { ClaimType } from '../../types'

const config: Record<ClaimType, { label: string; color: string }> = {
  FACT: { label: '事实', color: 'var(--color-primary)' },
  OPINION: { label: '观点', color: 'var(--color-evidence)' },
  FORECAST: { label: '预测', color: 'var(--color-warning)' },
  GUIDANCE: { label: '操作引导', color: 'var(--color-danger)' },
  RISK_DISCLOSURE: { label: '风险揭示', color: 'var(--color-success)' },
}

interface Props {
  type: ClaimType
}

export default function ClaimTypeBadge({ type }: Props) {
  const { label, color } = config[type]
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  )
}
