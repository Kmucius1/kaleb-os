import { getProjects, type Project } from '@/lib/github'
import { Lock, Globe } from 'lucide-react'
import ProjectStatusSelect from '@/components/ProjectStatusSelect'

export const revalidate = 300

// Which section a repo lands in: Kaleb's manual label wins; otherwise the
// raw git-activity bucket decides (active folds into "working now").
function groupOf(p: Project): string {
  if (p.status) return p.status
  if (p.activity === 'active') return 'working'
  if (p.activity === 'warm') return 'warm'
  return 'dormant'
}

const GROUPS: { key: string; title: string; emoji: string; color: string }[] = [
  { key: 'working', title: 'Working Now', emoji: '🔨', color: 'var(--green)' },
  { key: 'live', title: 'Live / Shipped', emoji: '🚀', color: '#60a5fa' },
  { key: 'warm', title: 'Warm', emoji: '🟡', color: '#fbbf24' },
  { key: 'idea', title: 'Ideas', emoji: '💡', color: 'var(--accent)' },
  { key: 'dormant', title: 'Dormant', emoji: '⚪', color: 'var(--muted)' },
  { key: 'shelved', title: 'Shelved', emoji: '🗄️', color: '#a16207' },
]

const ACTIVITY_DOT: Record<string, string> = { active: 'var(--green)', warm: '#fbbf24', dormant: '#6b7280' }

function ago(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${Math.round(days / 365)}y ago`
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  if (projects.length === 0) {
    return (
      <div className="page-pad" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Header count={0} />
        <div className="card2" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ color: 'var(--foreground-2)', fontSize: 14, marginBottom: 8 }}>No repos loaded</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            Set <code style={{ color: 'var(--accent)' }}>GITHUB_TOKEN</code> in the environment to pull your GitHub portfolio.
          </div>
        </div>
      </div>
    )
  }

  const byGroup = new Map<string, Project[]>()
  for (const p of projects) {
    const g = groupOf(p)
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(p)
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.daysSincePush - b.daysSincePush)
  }

  const activeCount = projects.filter(p => groupOf(p) === 'working').length
  const warmCount = projects.filter(p => groupOf(p) === 'warm').length
  const dormantCount = projects.filter(p => groupOf(p) === 'dormant').length
  const liveCount = projects.filter(p => p.status === 'live').length

  return (
    <div className="page-pad" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Header count={projects.length} />

      {/* glanceable overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Working Now', value: activeCount, color: 'var(--green)' },
          { label: 'Live', value: liveCount, color: '#60a5fa' },
          { label: 'Warm', value: warmCount, color: '#fbbf24' },
          { label: 'Dormant', value: dormantCount, color: 'var(--muted)' },
        ].map((s, i) => (
          <div key={i} className="stat-tile">
            <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-cap">{s.label}</div>
          </div>
        ))}
      </div>

      {GROUPS.map(g => {
        const list = byGroup.get(g.key)
        if (!list || list.length === 0) return null
        return (
          <div key={g.key} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13 }}>{g.emoji}</span>
              <span className="section-label" style={{ color: g.color }}>{g.title}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{list.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
              {list.map(p => <Card key={p.repo} p={p} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Header({ count }: { count: number }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: '2px 0 4px' }}>Projects</h1>
      <p style={{ color: 'var(--foreground-2)', fontSize: 13.5, margin: 0 }}>{count} repos · GitHub @Kmucius1</p>
    </div>
  )
}

function Card({ p }: { p: Project }) {
  return (
    <div className="card2" style={{ padding: 14, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', minWidth: 0 }}>
          <span title={p.activity} style={{ width: 7, height: 7, borderRadius: '50%', background: ACTIVITY_DOT[p.activity], flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          {p.isPrivate ? <Lock size={10} color="var(--muted)" /> : <Globe size={10} color="var(--muted)" />}
        </a>
        <ProjectStatusSelect repo={p.repo} value={p.status} />
      </div>

      {p.description && (
        <div style={{ fontSize: 11.5, color: 'var(--foreground-2)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.02em' }}>
        {p.language && <span>{p.language}</span>}
        <span>· {ago(p.daysSincePush)}</span>
        {p.archived && <span style={{ color: '#a16207' }}>· archived</span>}
      </div>
    </div>
  )
}
