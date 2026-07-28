'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, CheckCircle2, CheckSquare, Target, FolderOpen,
  Lightbulb, Inbox, Brain, Users, TrendingUp, BarChart2, Briefcase, Star,
  Calendar, Zap, Link2, ScrollText, Settings, Wallet, Clapperboard, Sparkles, LayoutGrid,
  ShoppingBag, CalendarDays, CircleCheckBig, LineChart, Flame,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number }
type NavSection = { title: string; items: NavItem[] }

const buildNav = (approvalCount: number, taskCount: number): NavSection[] => [
  {
    title: 'COMMAND',
    items: [
      { href: '/', label: 'Home', icon: LayoutDashboard },
      { href: '/schedule', label: 'Schedule', icon: CalendarDays },
      { href: '/atlas', label: 'Atlas', icon: Sparkles },
      { href: '/journal', label: 'Journal', icon: ScrollText },
      { href: '/more', label: 'More', icon: LayoutGrid },
      { href: '/daily-brief', label: 'Daily Brief', icon: FileText },
      { href: '/approvals', label: 'Approvals', icon: CheckCircle2, badge: approvalCount },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { href: '/content', label: 'Content Engine', icon: Clapperboard },
      { href: '/personal-brand', label: 'Personal Brand', icon: Star },
    ],
  },
  {
    title: 'COMMERCE',
    items: [
      { href: '/commerce', label: 'Product Scout', icon: ShoppingBag },
    ],
  },
  {
    title: 'EXECUTION',
    items: [
      { href: '/tasks', label: 'Tasks', icon: CheckSquare, badge: taskCount },
      { href: '/habits', label: 'Habits', icon: CircleCheckBig },
      { href: '/consistency', label: 'Consistency', icon: Flame },
      { href: '/goals', label: 'Goals', icon: Target },
      { href: '/projects', label: 'Projects', icon: FolderOpen },
      { href: '/ideas', label: 'Ideas', icon: Lightbulb },
      { href: '/insights', label: 'Insights', icon: LineChart },
    ],
  },
  {
    title: 'MEMORY',
    items: [
      { href: '/captures', label: 'Captures', icon: Inbox },
      { href: '/memory', label: 'Memories', icon: Brain },
      { href: '/contacts', label: 'Contacts', icon: Users },
      { href: '/patterns', label: 'Patterns', icon: TrendingUp },
    ],
  },
  {
    title: 'PERFORMANCE',
    items: [
      { href: '/business', label: 'Business', icon: Briefcase },
      { href: '/trading', label: 'Trading', icon: BarChart2 },
      { href: '/side-hustles', label: 'Side Hustles', icon: Wallet },
      { href: '/weekly-reviews', label: 'Weekly Reviews', icon: Calendar },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { href: '/agent-actions', label: 'Agent Actions', icon: Zap },
      { href: '/integrations', label: 'Integrations', icon: Link2 },
      { href: '/logs', label: 'Logs', icon: ScrollText },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function Sidebar({
  approvalCount = 0,
  taskCount = 0,
}: {
  approvalCount?: number
  taskCount?: number
}) {
  const pathname = usePathname()
  if (pathname?.startsWith('/login')) return null
  const sections = buildNav(approvalCount, taskCount)

  return (
    <nav className="kos-desktop-sidebar" style={{
      width: 232, minWidth: 232,
      background: '#0a0a0d',
      borderRight: '1px solid var(--border)',
      flexDirection: 'column',
      height: '100dvh',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={15} color="#0a0b0f" />
        </div>
        <div>
          <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>KALEB OS</div>
          <div style={{ color: 'var(--muted)', fontSize: 8, letterSpacing: '0.12em', marginTop: 1 }}>PERSONAL AI OPERATING SYSTEM</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            <div style={{ padding: '8px 18px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--muted)' }}>
              {section.title}
            </div>
            {section.items.map(item => {
              const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="row-hover" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 18px',
                  color: isActive ? 'var(--foreground)' : 'var(--foreground-2)',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.1s',
                }}>
                  <Icon size={14} color={isActive ? 'var(--accent)' : 'var(--muted)'} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, lineHeight: 1.6 }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 }}>K</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Kaleb Mucius</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>Owner</div>
        </div>
        <Link href="/settings"><Settings size={14} color="var(--muted)" style={{ cursor: 'pointer', flexShrink: 0 }} /></Link>
      </div>
    </nav>
  )
}
