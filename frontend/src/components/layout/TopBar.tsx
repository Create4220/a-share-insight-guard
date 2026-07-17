import { useLocation } from 'react-router-dom'
import { User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const pageTitles: Record<string, string> = {
  '/dashboard': '合规概览',
  '/review': '内容审校工作台',
  '/queue': '审核任务队列',
  '/rules': '规则中心',
  '/audit-logs': '审计记录',
}

export default function TopBar() {
  const location = useLocation()
  const basePath = '/' + (location.pathname.split('/')[1] || 'dashboard')
  const title = pageTitles[basePath] || '工作台'

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/70 px-5 backdrop-blur-sm">
      <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
      <Badge variant="secondary" className="h-auto gap-1.5 px-2.5 py-1 text-[11px] font-normal">
        <User className="h-3 w-3" />
        演示用户 · 内容运营
      </Badge>
    </header>
  )
}
