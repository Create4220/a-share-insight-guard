interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function scoreColor(score: number): string {
  if (score >= 85) return 'hsl(110 12% 52%)'    // sage green
  if (score >= 70) return 'hsl(170 15% 50%)'    // teal
  if (score >= 50) return 'hsl(38 35% 58%)'     // honey amber
  return 'hsl(0 35% 52%)'                        // muted red
}

function scoreLabel(score: number): string {
  if (score >= 85) return '合规良好'
  if (score >= 70) return '需补充完善'
  if (score >= 50) return '存在较多风险'
  return '严重不合规'
}

const sizes = {
  sm: { dimension: 56, strokeWidth: 5, fontSize: 16, labFontSize: 10 },
  md: { dimension: 88, strokeWidth: 7, fontSize: 24, labFontSize: 11 },
  lg: { dimension: 120, strokeWidth: 8, fontSize: 34, labFontSize: 12 },
}

export default function ScoreGauge({ score, size = 'md' }: Props) {
  const { dimension, strokeWidth, fontSize, labFontSize } = sizes[size]
  const radius = (dimension - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = ((100 - score) / 100) * circumference
  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="-rotate-90">
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="hsl(35 12% 84%)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-bold text-foreground"
          style={{ fontSize }}
        >
          {score}
        </div>
      </div>
      <span className="text-muted-foreground" style={{ fontSize: labFontSize }}>
        {scoreLabel(score)}{' '}
        <span className="text-muted-foreground/60">/ 100</span>
      </span>
    </div>
  )
}
