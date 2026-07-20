import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'

export const revalidate = 120

type Idea = {
  id: string
  title: string
  description: string | null
  category: string | null
  priority: string | number | null
  status: string | null
  source_ref: string | null
  created_at: string
}

function priorityColor(priority: string | number | null) {
  const map: Record<string, string> = {
    high: 'var(--accent)', '1': 'var(--accent)', '2': 'var(--accent)',
    medium: '#fbbf24', '3': '#fbbf24', '4': '#fbbf24',
    low: 'var(--muted)', '5': 'var(--muted)', '6': 'var(--muted)',
  }
  return map[String(priority ?? '')] ?? 'var(--muted)'
}

export default async function IdeasPage() {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })

  const all: Idea[] = data ?? []
  const hasIdeas = all.length > 0

  return (
    <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0 4px' }}>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Ideas</h1>
        <span className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>Phase 6</span>
      </div>
      <p style={{ color: 'var(--foreground-2)', fontSize: 13.5, margin: '0 0 20px' }}>
        {hasIdeas ? `${all.length} ideas captured — content that converts.` : 'Content ideas, surfaced from your captures.'}
      </p>

      {error && (
        <div className="card2" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 16, borderColor: 'var(--red)' }}>
          Error: {error.message}
        </div>
      )}

      {!hasIdeas ? (
        <div className="card2">
          <div className="section-label" style={{ marginBottom: 8 }}>No Ideas Yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.6, marginBottom: 10 }}>
            Atlas extracts content ideas from captures, voice notes, and emails — drafting posts and tracking which content converts followers into business leads.
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
            Ask Atlas: &ldquo;start surfacing content ideas from my captures and voice notes&rdquo;
          </div>
        </div>
      ) : (
        <>
          <div className="section-label" style={{ marginBottom: 12 }}>Captured Ideas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {all.map(idea => {
              const color = priorityColor(idea.priority)
              return (
                <div key={idea.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                }}>
                  <div className="tl-bar" style={{ background: color, minHeight: 34 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {idea.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      {idea.priority != null && (
                        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.04em', flexShrink: 0 }}>P{idea.priority}</span>
                      )}
                      {idea.category && (
                        <span style={{ fontSize: 11, color: 'var(--foreground-2)', flexShrink: 0 }}>{idea.category}</span>
                      )}
                      {idea.description && (
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {idea.category || idea.priority != null ? '· ' : ''}{idea.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    {idea.status && (
                      <span className="pillar-tag" style={{ color: 'var(--foreground-2)', background: 'var(--surface-3)' }}>{idea.status}</span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatTime(idea.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
