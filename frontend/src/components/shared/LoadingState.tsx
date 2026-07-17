import { Loader2 } from 'lucide-react'

interface Props {
  text?: string
}

export default function LoadingState({ text = '加载中...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="h-8 w-8 text-[var(--color-primary)] animate-spin mb-3" />
      <p className="text-sm text-[var(--color-text-muted)]">{text}</p>
    </div>
  )
}
