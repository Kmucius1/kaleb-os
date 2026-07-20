import { getProjects, type Project } from '@/lib/github'
import { FolderGit2, Lock, Globe } from 'lucide-react'
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
  { key: 'working', title: 'WORKING NOW', emoji: '🔨', color: '#10b981' },
  { key: 'live', title: 'LIVE / SHIPPED', emoji: '🚀', color: '#3b82f6' },
  { key: 'warm', title: 'WARM', emoji: '🟡', color: '#f59e0b' },
  { key: 'idea', title: 'IDEAS', emoji: '💡', color: '#8b5cf6' },
  { key: 'dormant', title: 'DORMANT', emoji: '⚪', color: 'var(--muted)' },
  { key: 'shelved', title: 'SHELVED', emoji: '🗄️', color: '#a16207' },
]

const ACTIVITY_DOT: Record<string, string> = { active: '#10b981', warm: '#f59e0b', dormant: '#6b7280' }

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
      <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
        <Header count={0} />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 8 }}>— no repos loaded —</div>
          <div style={{ fontSize: 11, color: '#666' }}>Set <code style={{ color: 'var(--accent)' }}>GITHUB_TOKEN</code> in the environment to pull your GitHub portfolio.</div>
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
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <Header count={projects.length} />

      {/* glanceable overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'WORKING NOW', value: activeCount, color: '#10b981' },
          { label: 'LIVE', value: liveCount, color: '#3b82f6' },
          { label: 'WARM', value: warmCount, color: '#f59e0b' },
          { label: 'DORMANT', value: dormantCount, color: 'var(--muted)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
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
              <span style={{ fontSize: 11, fontWeight: 700, color: g.color, letterSpacing: '0.1em' }}>{g.title}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{list.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <FolderGit2 size={16} color="var(--accent)" />
      <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>PROJECTS</span>
      <span style={{ color: 'var(--muted)', fontSize: 11 }}>{count} repos · GitHub @Kmucius1</span>
    </div>
  )
}

function Card({ p }: { p: Project }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', minWidth: 0 }}>
          <span title={p.activity} style={{ width: 7, height: 7, borderRadius: '50%', background: ACTIVITY_DOT[p.activity], flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          {p.isPrivate ? <Lock size={10} color="var(--muted)" /> : <Globe size={10} color="var(--muted)" />}
        </a>
        <ProjectStatusSelect repo={p.repo} value={p.status} />
      </div>

      {p.description && (
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.04em' }}>
        {p.language && <span>{p.language}</span>}
        <span>· {ago(p.daysSincePush)}</span>
        {p.archived && <span style={{ color: '#a16207' }}>· archived</span>}
      </div>
    </div>
  )
}
