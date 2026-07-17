'use client'
import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'

const MOODS = [
  { emoji: '😣', label: 'Stressed', score: 1, color: '#f87171' },
  { emoji: '😕', label: 'Low', score: 2, color: '#fbbf24' },
  { emoji: '😐', label: 'OK', score: 3, color: '#9aa1b1' },
  { emoji: '🙂', label: 'Good', score: 4, color: '#60a5fa' },
  { emoji: '😄', label: 'Great', score: 5, color: '#34d399' },
]

type Checkin = { id: string; mood: string | null; score: number | null; note: string | null; context: string | null; created_at: string }

export default function FeelingPage() {
  const [pick, setPick] = useState<typeof MOODS[number] | null>(null)
  const [note, setNote] = useState('')
  const [context, setContext] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [today, setToday] = useState<Checkin[]>([])

  async function load() {
    try { const r = await fetch('/api/mood'); const d = await r.json(); setToday(d.checkins ?? []) } catch { /* ignore */ }
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!pick || saving) return
    setSaving(true)
    try {
      await fetch('/api/mood', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: pick.label, score: pick.score, note, context, source: 'checkin' }),
      })
      setSaved(true); setNote(''); setContext(''); setPick(null)
      load()
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="page-pad" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="ios-largetitle" style={{ marginBottom: 4 }}>How are you feeling?</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 22 }}>A quick check-in. Tracking your mindset helps optimize your days.</p>

      {/* Mood picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {MOODS.map(m => {
          const on = pick?.label === m.label
          return (
            <button key={m.label} onClick={() => setPick(m)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '14px 4px', borderRadius: 14, cursor: 'pointer',
              background: on ? `${m.color}22` : 'var(--surface)',
              border: `1.5px solid ${on ? m.color : 'var(--border)'}`,
              transition: 'all 0.12s', transform: on ? 'scale(1.04)' : 'none',
            }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>{m.emoji}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: on ? m.color : 'var(--muted)' }}>{m.label}</span>
            </button>
          )
        })}
      </div>

      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What's on your mind? (optional)" rows={3}
        style={field} />
      <input value={context} onChange={e => setContext(e.target.value)} placeholder="What are you doing right now? (optional)"
        style={{ ...field, minHeight: 0 }} />

      <button onClick={save} disabled={!pick || saving} style={{
        width: '100%', marginTop: 6, padding: '14px', borderRadius: 12, border: 'none',
        background: pick ? 'var(--accent)' : 'var(--surface-2)', color: pick ? '#fff' : 'var(--muted)',
        fontSize: 15, fontWeight: 700, cursor: pick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {saving ? <Loader2 size={17} className="spin" /> : saved ? <Check size={17} /> : null}
        {saved ? 'Logged' : 'Log check-in'}
      </button>

      {/* Today's check-ins */}
      {today.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 10 }}>TODAY · {today.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {today.map(c => {
              const m = MOODS.find(x => x.label === c.mood)
              return (
                <div key={c.id} className="list-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22 }}>{m?.emoji ?? '•'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: m?.color ?? 'var(--foreground)' }}>{c.mood ?? '—'}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{time(c.created_at)}</span>
                    </div>
                    {c.note && <div style={{ fontSize: 13, color: 'var(--foreground-2)', marginTop: 3 }}>{c.note}</div>}
                    {c.context && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>· {c.context}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const field: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12,
  padding: '12px 14px', color: 'var(--foreground)', fontSize: 15, fontFamily: 'inherit', outline: 'none',
  resize: 'none', marginBottom: 10, lineHeight: 1.45,
}
