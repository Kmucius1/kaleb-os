'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Home, LayoutGrid, Clapperboard, Briefcase, CalendarDays } from 'lucide-react'

type Tab = { href: string; label: string; icon: React.ElementType; badge?: number }

export default function TabBar({
  approvalCount = 0,
  taskCount = 0,
}: {
  approvalCount?: number
  taskCount?: number
}) {
  const pathname = usePathname()

  // No tab bar on the login screen
  if (pathname?.startsWith('/login')) return null

  const tabs: Tab[] = [
    { href: '/', label: 'Atlas', icon: Sparkles },
    { href: '/dashboard', label: 'Today', icon: Home },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/apps', label: 'Apps', icon: LayoutGrid, badge: approvalCount + taskCount },
    { href: '/content', label: 'Content', icon: Clapperboard },
    { href: '/business', label: 'Business', icon: Briefcase },
  ]

  return (
    <nav className="ios-tabbar">
      {tabs.map(tab => {
        const Icon = tab.icon
        const active =
          tab.href === '/' ? pathname === '/' : pathname?.startsWith(tab.href)
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
