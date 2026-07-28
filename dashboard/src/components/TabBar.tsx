'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Orbit, NotebookPen, LayoutGrid } from 'lucide-react'

// One navigation architecture, five destinations. Everything else lives under
// More — no giant app-icon grid as the primary experience.

type Tab = { href: string; label: string; icon: React.ElementType; badge?: number }

export default function TabBar({ approvalCount = 0, taskCount = 0 }: { approvalCount?: number; taskCount?: number }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/login')) return null

  const tabs: Tab[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/atlas', label: 'Atlas', icon: Orbit },
    { href: '/journal', label: 'Journal', icon: NotebookPen },
    { href: '/more', label: 'More', icon: LayoutGrid, badge: approvalCount + taskCount },
  ]

  return (
    <nav className="ios-tabbar" aria-label="Primary">
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = tab.href === '/' ? pathname === '/' : pathname?.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`ios-tab${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
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
