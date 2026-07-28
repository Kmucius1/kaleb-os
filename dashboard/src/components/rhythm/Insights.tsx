'use client'
import { useEffect, useState } from 'react'
import { AlertCircle, CircleDashed, Lightbulb, Link2, Sparkles, ThumbsUp, Repeat } from 'lucide-react'
import type { Synthesis } from '@/lib/rhythm/synthesis'

// The Insights tab. Counts first (exact, always there), the model's read second
// (labelled as a read, not as truth).

export default function Insights() {
  const [data, setData] = useState<Synthesis | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [days, setDays] = useState(30)

  useEffect(() => {
    setState('loading')
    fetch(`/api/journal/synthesis?days=${days}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(d => { setData(d); setState('ready') })
      .catch(() => setState('error'))
  }, [days])

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skel" style={{ height: 92 }} />
        <div className="skel" style={{ height: 150 }} />
        <div className="skel" style={{ height: 120 }} />
      </div>
    )
  }

  if (state === 'error' || !data) {
    return (
      <div className="pcard" style={{ padding: 26, textAlign: 'center' }}>
        <p style={{ fontSize: 13.5, color: 'var(--foreground-2)', margin: '0 0 12px' }}>Couldn’t build your insights.</p>
        <button onClick={() => setDays(d => d)} className="press" style={{
          minHeight: 42, padding: '0 18px', borderRadius: 12, cursor: 'pointer',
          background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 13,
        }}>Try again</button>
      </div>
    )
  }

  const c = data.counted
  const r = data.read

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="seg" style={{ marginBottom: 2 }}>
        {[7, 30, 90].map(d => (
          <button key={d} className={`seg-item${days === d ? ' active' : ''}`} onClick={() => setDays(d)}
            style={{ border: 'none', background: days === d ? undefined : 'transparent', minHeight: 40 }}>
            {d} days
          </button>
        ))}
      </div>

      {/* Counted — exact */}
      <div className="pcard">
        <div className="label" style={{ marginBottom: 12 }}>By the numbers</div>
        <div className="stat-grid">
          <Stat n={c.entries} cap="Entries" />
          <Stat n={c.days} cap="Days journaled" sub={`of ${data.windowDays}`} />
          <Stat n={c.openCommitments.length} cap="Open commitments" tone={c.openCommitments.length > 4 ? 'warn' : undefined} />
          <Stat n={c.approvedCount} cap="Turned into action" sub={c.rejectedCount ? `${c.rejectedCount} dismissed` : undefined} />
        </div>

        {c.moods.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="label" style={{ marginBottom: 8 }}>How you labelled it</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.moods.map(m => (
                <span key={m.mood} style={{
                  fontSize: 12, padding: '5px 11px', borderRadius: 999, textTransform: 'capitalize',
                  background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--foreground-2)',
                }}>
                  {m.mood} <span style={{ color: 'var(--muted)' }}>{m.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {c.openCommitments.length > 0 && (
        <Section icon={CircleDashed} color="var(--yellow)" title="Said you would, still open">
          {c.openCommitments.map((k, i) => (
            <Row key={i} text={k.text} note={`since ${k.since}`} />
          ))}
        </Section>
      )}

      {data.readNote && (
        <div className="pcard" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>{data.readNote}</p>
        </div>
      )}

      {r && (
        <>
          {r.connection && (
            <div className="pcard" style={{ borderColor: 'color-mix(in srgb, var(--accent) 35%, var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                <Link2 size={13} color="var(--accent)" />
                <span className="label" style={{ color: 'var(--accent)' }}>The connection</span>
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: 0 }}>{r.connection}</p>
            </div>
          )}

          {r.themes.length > 0 && <Section icon={Repeat} color="var(--spirit)" title="What keeps coming back">{r.themes.map((t, i) => <Row key={i} text={t} />)}</Section>}
          {r.wins.length > 0 && <Section icon={ThumbsUp} color="var(--green)" title="Wins">{r.wins.map((t, i) => <Row key={i} text={t} />)}</Section>}
          {r.frustrations.length > 0 && <Section icon={AlertCircle} color="var(--red)" title="What drains you">{r.frustrations.map((t, i) => <Row key={i} text={t} />)}</Section>}
          {r.recurringIdeas.length > 0 && <Section icon={Lightbulb} color="var(--mission)" title="Ideas you keep raising">{r.recurringIdeas.map((t, i) => <Row key={i} text={t} />)}</Section>}
          {r.blindSpots.length > 0 && <Section icon={CircleDashed} color="var(--yellow)" title="Mentioned once, never followed up">{r.blindSpots.map((t, i) => <Row key={i} text={t} />)}</Section>}
          {r.contentWorthy.length > 0 && <Section icon={Sparkles} color="var(--money)" title="Content-worthy">{r.contentWorthy.map((t, i) => <Row key={i} text={t} />)}</Section>}

          <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '4px 0 0', lineHeight: 1.4 }}>
            The sections above are a reading of your entries, not a measurement.
          </p>
        </>
      )}
    </div>
  )
}

function Stat({ n, cap, sub, tone }: { n: number; cap: string; sub?: string; tone?: 'warn' }) {
  return (
    <div className="stat-tile">
      <div className="stat-num" style={{ color: tone === 'warn' ? 'var(--yellow)' : undefined }}>{n}</div>
      <div className="stat-cap">{cap}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function Section({ icon: Icon, color, title, children }: {
  icon: React.ElementType; color: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="pcard">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
        <Icon size={13} color={color} />
        <span className="label" style={{ color }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div>
    </div>
  )
}

function Row({ text, note }: { text: string; note?: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--muted)', flexShrink: 0, marginTop: 8 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{text}</div>
        {note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{note}</div>}
      </div>
    </div>
  )
}
