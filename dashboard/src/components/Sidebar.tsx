'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, CheckCircle2,
  CheckSquare, Target, FolderOpen, Lightbulb,
  Inbox, Brain, Users, TrendingUp,
  BarChart2, Briefcase, Star, Calendar,
  Zap, Link2, ScrollText, Settings, ChevronRight, Wallet, Clapperboard, Sparkles, Menu, X
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number }
type NavSection = { title: string; items: NavItem[] }

const buildNav = (approvalCount: number, taskCount: number): NavSection[] => [
  {
    title: 'COMMAND',
    items: [
      { href: '/', label: 'Atlas', icon: Sparkles },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/daily-brief', label: 'Daily Brief', icon: FileText },
      { href: '/approvals', label: 'Approvals', icon: CheckCircle2, badge: approvalCount },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { href: '/content', label: 'Content Engine', icon: Clapperboard },
    ],
  },
  {
    title: 'EXECUTION',
    items: [
      { href: '/tasks', label: 'Tasks', icon: CheckSquare, badge: taskCount },
      { href: '/goals', label: 'Goals', icon: Target },
      { href: '/projects', label: 'Projects', icon: FolderOpen },
      { href: '/ideas', label: 'Ideas', icon: Lightbulb },
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
      { href: '/trading', label: 'Trading', icon: BarChart2 },
      { href: '/business', label: 'Business', icon: Briefcase },
      { href: '/side-hustles', label: 'Side Hustles', icon: Wallet },
      { href: '/personal-brand', label: 'Personal Brand', icon: Star },
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
  const sections = buildNav(approvalCount, taskCount)
  const [open, setOpen] = useState(false)

  return (
    <>
    <button className="kos-hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu" style={{
      position: 'fixed', top: 12, right: 12, zIndex: 210,
      width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer',
    }}>{open ? <X size={18} /> : <Menu size={18} />}</button>
    {open && <div className="kos-backdrop" onClick={() => setOpen(false)} />}
    <nav className={`kos-sidebar${open ? ' kos-open' : ''}`} style={{
      width: 216,
      minWidth: 216,
      background: '#0a0a0a',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15, letterSpacing: '0.06em' }}>
          KALEBOS
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 8, letterSpacing: '0.12em', marginTop: 2 }}>
          PERSONAL AI OPERATING SYSTEM
        </div>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            <div style={{
              padding: '8px 16px 4px',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--muted)',
            }}>
              {section.title}
            </div>
            {section.items.map(item => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 16px',
                    color: isActive ? 'var(--foreground)' : 'var(--foreground-2)',
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.1s',
                    position: 'relative',
                  }}
                >
                  <Icon size={13} color={isActive ? 'var(--accent)' : 'var(--muted)'} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 10,
                      lineHeight: 1.6,
                    }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 12,
          color: '#fff',
          flexShrink: 0,
        }}>
          K
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Kaleb Mucius
          </div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>Owner</div>
        </div>
        <Settings size={13} color="var(--muted)" style={{ cursor: 'pointer', flexShrink: 0 }} />
      </div>
    </nav>
    </>
  )
}
