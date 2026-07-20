import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { Lightbulb } from 'lucide-react'

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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Title */}
      <div className="rise rise-1" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="h-hero" style={{ margin: 0 }}>Ideas</h1>
          <span className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>Phase 6</span>
        </div>
        <p style={{ color: 'var(--foreground-2)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }}>
          {hasIdeas ? `${all.length} ideas captured — content that converts.` : 'Content ideas, surfaced from your captures.'}
        </p>
      </div>

      {error && (
        <div className="card2 rise rise-2" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 16, borderColor: 'var(--red)' }}>
          Error: {error.message}
        </div>
      )}

      {!hasIdeas ? (
        <div className="pcard rise rise-2">
          <div className="label" style={{ marginBottom: 10 }}>No Ideas Yet</div>
          <div style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.6, marginBottom: 10 }}>
            Atlas extracts content ideas from captures, voice notes, and emails — drafting posts and tracking which content converts followers into business leads.
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
            Ask Atlas: &ldquo;start surfacing content ideas from my captures and voice notes&rdquo;
          </div>
        </div>
      ) : (
        <>
          <div className="label rise rise-2" style={{ margin: '0 4px 12px' }}>Captured Ideas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {all.map((idea, i) => {
              const color = priorityColor(idea.priority)
              return (
                <div key={idea.id} className={`pcard press rise rise-${Math.min(7, (i % 6) + 2)}`} style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: color }} />
                  <span className="grad-icon" style={{ width: 40, height: 40, background: `${color === 'var(--muted)' ? 'var(--surface-3)' : color === 'var(--accent)' ? 'var(--accent-dim)' : 'var(--yellow-dim)'}`, borderRadius: 12, flexShrink: 0 }}><Lightbulb size={19} color={color} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
