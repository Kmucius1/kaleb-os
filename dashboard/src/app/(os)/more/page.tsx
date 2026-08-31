import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { countTasksNow } from '@/lib/taskCount'
import { Apple,
  CircleCheckBig, Target, FolderOpen, BarChart2, Clapperboard, Briefcase, Wallet,
  Users, LineChart, Settings, ChevronRight, Inbox, Brain, TrendingUp, CheckSquare,
  CheckCircle2, ShoppingBag, Star, Calendar, Zap, Link2, ScrollText, Flame, FileText,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// "More" is a plain, scannable list — not a springboard of app icons. Grouped
// the way the six pillars actually divide Kaleb's life.

type Item = { href: string; label: string; icon: React.ElementType; badge?: number; note?: string }

export default async function MorePage() {
  const [{ count: approvals }, { count: tasks }] = await Promise.all([
    supabase.from('agent_actions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    countTasksNow(),
  ])

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Execution',
      items: [
        { href: '/tasks', label: 'Tasks', icon: CheckSquare, badge: tasks ?? 0 },
        { href: '/habits', label: 'Habits', icon: CircleCheckBig },
        { href: '/fuel', label: 'Fuel', icon: Apple, note: 'Meals, macros, body trends' },
        { href: '/goals', label: 'Goals', icon: Target },
        { href: '/projects', label: 'Projects', icon: FolderOpen },
        { href: '/approvals', label: 'Approvals', icon: CheckCircle2, badge: approvals ?? 0 },
      ],
    },
    {
      title: 'Money & Mission',
      items: [
        { href: '/trading', label: 'Trading', icon: BarChart2 },
        { href: '/business', label: 'Business', icon: Briefcase },
        { href: '/side-hustles', label: 'Finances', icon: Wallet },
        { href: '/commerce', label: 'Product Scout', icon: ShoppingBag },
        { href: '/content', label: 'Content', icon: Clapperboard },
        { href: '/personal-brand', label: 'Personal Brand', icon: Star },
      ],
    },
    {
      title: 'Relationships & Memory',
      items: [
        { href: '/contacts', label: 'Relationships', icon: Users },
        { href: '/captures', label: 'Captures', icon: Inbox },
        { href: '/memory', label: 'Memories', icon: Brain },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { href: '/insights', label: 'Insights', icon: LineChart },
        { href: '/patterns', label: 'Patterns', icon: TrendingUp },
        { href: '/consistency', label: 'Consistency', icon: Flame },
        { href: '/daily-brief', label: 'Daily Brief', icon: FileText },
        { href: '/weekly-reviews', label: 'Weekly Review', icon: Calendar },
      ],
    },
    {
      title: 'System',
      items: [
        { href: '/agent-actions', label: 'Agent Actions', icon: Zap },
        { href: '/integrations', label: 'Integrations', icon: Link2 },
        { href: '/logs', label: 'Logs', icon: ScrollText },
        { href: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ]

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 32px' }}>
      <h1 className="h-hero rise rise-1" style={{ margin: '0 0 20px', fontSize: 26 }}>More</h1>

      {groups.map((g, gi) => (
        <section key={g.title} className={`rise rise-${Math.min(6, gi + 2)}`} style={{ marginBottom: 18 }}>
          <div className="label" style={{ margin: '0 4px 8px' }}>{g.title}</div>
          <div className="pcard" style={{ padding: '4px 6px' }}>
            {g.items.map((it, i) => {
              const Icon = it.icon
              return (
                <Link key={it.href} href={it.href} className="press" style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 10px', minHeight: 48,
                  borderBottom: i < g.items.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <Icon size={17} color="var(--foreground-2)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14.5 }}>{it.label}</span>
                  {it.badge != null && it.badge > 0 && (
                    <span style={{
                      background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '2px 7px', borderRadius: 10,
                    }}>{it.badge}</span>
                  )}
                  <ChevronRight size={15} color="var(--muted)" style={{ flexShrink: 0 }} />
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
