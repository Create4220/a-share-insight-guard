import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSearch,
  ClipboardList,
  ShieldCheck,
  History,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: '概览', icon: LayoutDashboard },
  { to: '/review', label: '审校', icon: FileSearch },
  { to: '/queue', label: '队列', icon: ClipboardList },
  { to: '/rules', label: '规则', icon: ShieldCheck },
  { to: '/audit-logs', label: '审计', icon: History },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="flex h-screen w-[96px] shrink-0 flex-col items-center border-r border-border bg-card py-5">
      {/* Logo */}
      <Link to="/dashboard" className="flex flex-col items-center gap-1.5 mb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Scale className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-[20px] font-semibold leading-tight text-foreground text-center">
          Insight
          <br />
          Guard
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center justify-center gap-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === '/dashboard'
              ? location.pathname === '/dashboard' || location.pathname === '/'
              : location.pathname.startsWith(to)

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-[35px] w-[35px] shrink-0" />
              <span className="text-[20px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom indicator */}
      <div className="mt-auto flex flex-col items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
        <span className="text-[18px] text-muted-foreground">演示</span>
      </div>
    </aside>
  )
}
