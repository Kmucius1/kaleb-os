'use client'
import { useState } from 'react'
import VoiceJournal from '@/components/rhythm/VoiceJournal'
import { Brain, ChevronRight } from 'lucide-react'

type Entry = { id: string; content: string; kind?: string; created_at: string }
type Pattern = { id?: string; title?: string; pattern?: string; name?: string; content?: string; description?: string; detail?: string }

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
const meta = (k?: string) => KIND_META[k || 'note'] || { label: k || 'Note', color: '#60a5fa' }

function when(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(d)
  const dk = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(x)
  const sameDay = dk(d) === dk(now)
  return sameDay ? `Today, ${t}` : `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(d)}, ${t}`
}

type Tab = 'capture' | 'entries' | 'insights'

export default function JournalView({ entries, patterns }: { entries: Entry[]; patterns: Pattern[] }) {
  const [tab, setTab] = useState<Tab>('capture')

  return (
    <>
      <div className="seg rise rise-1" style={{ marginBottom: 16 }}>
        {(['capture', 'entries', 'insights'] as Tab[]).map(t => (
          <button key={t} className={`seg-item${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}
            style={{ border: 'none', background: tab === t ? undefined : 'transparent', textTransform: 'capitalize' }}>
            {t === 'insights' ? 'Insights' : t === 'entries' ? 'Entries' : 'Capture'}
          </button>
        ))}
      </div>

      {tab === 'capture' && (
        <div style={{ marginBottom: 8 }}><VoiceJournal /></div>
      )}

      {tab === 'entries' && (
        <>
          <div className="rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 12px' }}>
            <span className="label">Recent Entries</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{entries.length} entries</span>
          </div>
          {entries.length === 0 ? (
            <div className="pcard" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 28 }}>Nothing captured yet — speak your first entry in Capture.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map((e, i) => {
                const m = meta(e.kind)
                return (
                  <div key={e.id} className={`pcard rise rise-${Math.min(6, (i % 5) + 1)}`} style={{ position: 'relative', padding: '13px 15px 13px 16px' }}>
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
        </>
      )}

      {tab === 'insights' && (
        patterns.length === 0 ? (
          <div className="pcard" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 28 }}>
            <Brain size={22} color="var(--muted)" style={{ marginBottom: 8 }} />
            <div>No insights yet. As you journal, Atlas surfaces patterns here.</div>
          </div>
        ) : (
          <>
            <div className="rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 12px' }}>
              <span className="label">Insights from Atlas</span>
              <ChevronRight size={15} color="var(--muted)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {patterns.map((p, i) => (
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
        )
      )}
    </>
  )
}
