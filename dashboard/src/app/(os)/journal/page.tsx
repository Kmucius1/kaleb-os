import { supabase } from '@/lib/supabase'
import JournalCapture from '@/components/JournalCapture'
import { Search, Brain, Sparkles, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const KIND_META: Record<string, { label: string; color: string }> = {
  thought: { label: 'Thought', color: '#a855f7' },
  win: { label: 'Win', color: '#34d399' },
  gratitude: { label: 'Gratitude', color: '#8b5cf6' },
  lesson: { label: 'Lesson', color: '#fbbf24' },
  reflection: { label: 'Reflection', color: '#34d399' },
  idea: { label: 'Idea', color: '#fb923c' },
  meditation: { label: 'Meditation', color: '#8b5cf6' },
  note: { label: 'Note', color: '#60a5fa' },
}
const meta = (k?: string) => KIND_META[k || 'note'] || { label: (k || 'Note'), color: '#60a5fa' }

function when(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(d)
  const sameDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d) === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)
  return sameDay ? `Today, ${t}` : `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(d)}, ${t}`
}

export default async function JournalPage() {
  const [{ data: entries }, { data: patterns }] = await Promise.all([
    supabase.from('journal').select('id,content,kind,created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('patterns').select('*').order('created_at', { ascending: false }).limit(3).then(r => r, () => ({ data: [] as any[] })),
  ])
  const all = entries ?? []

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Journal</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><Search size={17} color="var(--foreground-2)" /></span>
      </div>

      {/* Segmented */}
      <div className="seg rise rise-1" style={{ marginBottom: 16 }}>
        <span className="seg-item active">Capture</span>
        <span className="seg-item">Entries</span>
        <span className="seg-item">Insights</span>
      </div>

      {/* Capture */}
      <div style={{ marginBottom: 24 }}><JournalCapture /></div>

      {/* Recent entries */}
      <div className="rise rise-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 12px' }}>
        <span className="label">Recent Entries</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{all.length} entries</span>
      </div>
      {all.length === 0 ? (
        <div className="pcard rise rise-3" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 28 }}>Nothing captured yet — speak your first entry above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {all.map((e: any, i: number) => {
            const m = meta(e.kind)
            return (
              <div key={e.id} className={`pcard rise rise-${Math.min(6, (i % 5) + 2)}`} style={{ position: 'relative', padding: '13px 15px 13px 16px' }}>
                <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 4, borderRadius: 4, background: m.color }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{when(e.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 13, color: 'var(--foreground-2)', lineHeight: 1.5 }}>{e.content}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Insights from Atlas */}
      {(patterns ?? []).length > 0 && (
        <>
          <div className="rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 2px 12px' }}>
            <span className="label">Insights from Atlas</span>
            <ChevronRight size={15} color="var(--muted)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(patterns ?? []).map((p: any, i: number) => (
              <div key={p.id ?? i} className="pcard rise" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span className="grad-icon" style={{ width: 34, height: 34, background: 'var(--accent-dim)', borderRadius: 11, flexShrink: 0 }}><Brain size={17} color="var(--accent)" /></span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{p.title || p.pattern || p.name || p.content || 'Pattern detected'}</div>
                  {(p.description || p.detail) && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.45 }}>{p.description || p.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
