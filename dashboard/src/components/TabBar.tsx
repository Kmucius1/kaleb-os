'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Orbit, Home, CalendarDays, NotebookPen, Building2 } from 'lucide-react'

type Tab = { href: string; label: string; icon: React.ElementType; badge?: number; match?: string }

export default function TabBar({
  approvalCount = 0,
  taskCount = 0,
}: {
  approvalCount?: number
  taskCount?: number
}) {
  const pathname = usePathname()
  if (pathname?.startsWith('/login')) return null

  const tabs: Tab[] = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/', label: 'Atlas', icon: Orbit },
    { href: '/feeling', label: 'Journal', icon: NotebookPen },
    { href: '/business', label: 'Empire', icon: Building2, badge: approvalCount + taskCount },
  ]

  return (
    <nav className="ios-tabbar">
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = tab.href === '/' ? pathname === '/' : pathname?.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} className={`ios-tab${active ? ' active' : ''}`}>
            {tab.badge != null && tab.badge > 0 && (
              <span className="ios-tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>
            )}
            <Icon size={23} strokeWidth={active ? 2.4 : 2} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
