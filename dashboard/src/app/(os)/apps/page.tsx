import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getSpace, SPACE_META } from '@/lib/space'
import { User, Building2 } from 'lucide-react'
import {
  Sparkles, Home, FileText, CheckCircle2, CheckSquare, Target, FolderOpen,
  Lightbulb, Inbox, Brain, Users, TrendingUp, BarChart2, Briefcase, Star,
  Calendar, Zap, Link2, ScrollText, Settings, Wallet, Clapperboard, HeartPulse,
  CalendarDays,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type App = { href: string; label: string; icon: React.ElementType; color: string; badge?: number }
type Group = { title: string; apps: App[] }

export default async function AppsPage() {
  const [{ count: approvalCount }, { count: taskCount }, space] = await Promise.all([
    supabase.from('agent_actions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    getSpace(),
  ])
  const ac = approvalCount ?? 0
  const tc = taskCount ?? 0
  const meta = SPACE_META[space]
  const SpaceIcon = space === 'dryp' ? Building2 : User

  const personalGroups: Group[] = [
    {
      title: 'Command',
      apps: [
        { href: '/', label: 'Atlas', icon: Sparkles, color: 'linear-gradient(135deg,#6366f1,#22d3ee)' },
        { href: '/dashboard', label: 'Today', icon: Home, color: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
        { href: '/schedule', label: 'Schedule', icon: CalendarDays, color: 'linear-gradient(135deg,#8b5cf6,#c084fc)' },
        { href: '/feeling', label: 'Feeling', icon: HeartPulse, color: 'linear-gradient(135deg,#ec4899,#f472b6)' },
        { href: '/daily-brief', label: 'Brief', icon: FileText, color: 'linear-gradient(135deg,#64748b,#94a3b8)' },
        { href: '/approvals', label: 'Approvals', icon: CheckCircle2, color: 'linear-gradient(135deg,#f59e0b,#fbbf24)', badge: ac },
      ],
    },
    {
      title: 'Create',
      apps: [
        { href: '/content', label: 'Content', icon: Clapperboard, color: 'linear-gradient(135deg,#6366f1,#818cf8)' },
        { href: '/personal-brand', label: 'Brand', icon: Star, color: 'linear-gradient(135deg,#a855f7,#c084fc)' },
        { href: '/ideas', label: 'Ideas', icon: Lightbulb, color: 'linear-gradient(135deg,#eab308,#fbbf24)' },
      ],
    },
    {
      title: 'Missions & Ventures',
      apps: [
        { href: '/trading', label: 'Trading', icon: BarChart2, color: 'linear-gradient(135deg,#16a34a,#4ade80)' },
        { href: '/side-hustles', label: 'Ventures', icon: Wallet, color: 'linear-gradient(135deg,#d97706,#f59e0b)' },
        { href: '/goals', label: 'Goals', icon: Target, color: 'linear-gradient(135deg,#ef4444,#f87171)' },
        { href: '/projects', label: 'Projects', icon: FolderOpen, color: 'linear-gradient(135deg,#3b82f6,#60a5fa)' },
      ],
    },
    {
      title: 'Execution',
      apps: [
        { href: '/tasks', label: 'Tasks', icon: CheckSquare, color: 'linear-gradient(135deg,#10b981,#34d399)', badge: tc },
        { href: '/weekly-reviews', label: 'Reviews', icon: Calendar, color: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
      ],
    },
    {
      title: 'Memory',
      apps: [
        { href: '/captures', label: 'Captures', icon: Inbox, color: 'linear-gradient(135deg,#0891b2,#22d3ee)' },
        { href: '/memory', label: 'Memories', icon: Brain, color: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
        { href: '/contacts', label: 'Contacts', icon: Users, color: 'linear-gradient(135deg,#2563eb,#60a5fa)' },
        { href: '/patterns', label: 'Patterns', icon: TrendingUp, color: 'linear-gradient(135deg,#059669,#34d399)' },
      ],
    },
  ]

  const drypGroups: Group[] = [
    {
      title: 'Agency',
      apps: [
        { href: '/business', label: 'DRYP', icon: Briefcase, color: 'linear-gradient(135deg,#0d9488,#14b8a6)' },
        { href: '/content', label: 'Client Content', icon: Clapperboard, color: 'linear-gradient(135deg,#0d9488,#2dd4bf)' },
        { href: '/contacts', label: 'Contacts', icon: Users, color: 'linear-gradient(135deg,#0891b2,#22d3ee)' },
        { href: '/approvals', label: 'Approvals', icon: CheckCircle2, color: 'linear-gradient(135deg,#f59e0b,#fbbf24)', badge: ac },
      ],
    },
    {
      title: 'Delivery',
      apps: [
        { href: '/projects', label: 'Projects', icon: FolderOpen, color: 'linear-gradient(135deg,#0d9488,#14b8a6)' },
        { href: '/tasks', label: 'Tasks', icon: CheckSquare, color: 'linear-gradient(135deg,#10b981,#34d399)', badge: tc },
        { href: '/daily-brief', label: 'Brief', icon: FileText, color: 'linear-gradient(135deg,#64748b,#94a3b8)' },
        { href: '/weekly-reviews', label: 'Reviews', icon: Calendar, color: 'linear-gradient(135deg,#0e7490,#22d3ee)' },
      ],
    },
  ]

  const sharedGroup: Group = {
    title: 'System',
    apps: [
      { href: '/agent-actions', label: 'Actions', icon: Zap, color: 'linear-gradient(135deg,#f59e0b,#fcd34d)' },
      { href: '/integrations', label: 'Connect', icon: Link2, color: 'linear-gradient(135deg,#475569,#64748b)' },
      { href: '/logs', label: 'Logs', icon: ScrollText, color: 'linear-gradient(135deg,#374151,#6b7280)' },
      { href: '/settings', label: 'Settings', icon: Settings, color: 'linear-gradient(135deg,#334155,#64748b)' },
    ],
  }

  const groups: Group[] = [...(space === 'dryp' ? drypGroups : personalGroups), sharedGroup]

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 14px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 6px 2px' }}>
        <h1 className="ios-largetitle">Apps</h1>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: meta.color, background: `${meta.color}1f`, padding: '4px 10px', borderRadius: 20 }}>
          <SpaceIcon size={13} /> {meta.label}
        </span>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 6px 20px' }}>
        {space === 'dryp' ? 'The agency — clients, delivery & revenue' : 'You + your missions & ventures'}
      </p>

      {groups.map(group => (
        <section key={group.title} style={{ marginBottom: 22 }}>
          <h2 style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--muted)', margin: '0 6px 8px',
          }}>{group.title}</h2>
          <div className="springboard">
            {group.apps.map(app => {
              const Icon = app.icon
              return (
                <Link key={group.title + app.href + app.label} href={app.href} className="app-icon">
                  <span className="app-tile" style={{ background: app.color }}>
                    <Icon size={28} color="#fff" strokeWidth={2} />
                    {app.badge != null && app.badge > 0 && (
                      <span className="app-tile-badge">{app.badge > 99 ? '99+' : app.badge}</span>
                    )}
                  </span>
                  <span className="app-label">{app.label}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
