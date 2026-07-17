import { Outlet } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto py-5 pl-12 pr-5 lg:pl-14 lg:pr-7">
            <div className="mx-auto max-w-[1440px]">
              <Outlet />
            </div>
          </main>
          <footer className="border-t border-border bg-background px-6 py-2.5 text-center text-[11px] text-muted-foreground">
            本平台仅用于金融信息内容治理与技术研究演示，不构成任何证券投资建议、投资邀约或收益承诺。证券市场存在风险，投资需谨慎。
          </footer>
        </div>
      </div>
    </TooltipProvider>
  )
}
