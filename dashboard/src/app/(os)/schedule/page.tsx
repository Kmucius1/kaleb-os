import { getTodaySchedule, fmtClock, PILLAR_COLORS, type Block } from '@/lib/schedule'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

const DAY_LABEL: Record<string, string> = { weekday: 'Weekday', saturday: 'Saturday', sunday: 'Sunday · Reset Day' }
const DOW_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayLabel(): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' }).format(new Date())
}

async function getLaw() {
  const { data } = await supabase.from('kalebos_config').select('key,value').in('key', ['rules', 'schedule_philosophy'])
  const out: Record<string, any> = {}
  for (const r of data ?? []) { try { out[r.key] = JSON.parse(r.value) } catch { out[r.key] = r.value } }
  return out
}

export default async function SchedulePage() {
  const [s, law] = await Promise.all([getTodaySchedule(), getLaw()])
  const rules: { n: number; title: string; body: string }[] = law.rules ?? []
  const philosophy: string = typeof law.schedule_philosophy === 'string' ? law.schedule_philosophy : ''

  return (
    <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Schedule</h1>
        <span className="section-label" style={{ color: 'var(--muted)' }}>{DOW_NAME[s.dow]} · {DAY_LABEL[s.dayType]}</span>
      </div>

      {/* Day / Week / Month segmented control */}
      <div className="seg" style={{ marginBottom: 12 }}>
        <span className="seg-item active">Day</span>
        <span className="seg-item">Week</span>
        <span className="seg-item">Month</span>
      </div>

      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', marginBottom: 20 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, color: 'var(--muted)' }}><ChevronLeft size={18} /></span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Today, {todayLabel()}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{fmtClock(s.nowMin)} ET</div>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, color: 'var(--muted)' }}><ChevronRight size={18} /></span>
      </div>

      {/* Now / Next strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <NowCard label="RIGHT NOW" block={s.current} accent />
        <NowCard label="UP NEXT" block={s.next} />
      </div>

      {/* Today's events (one-offs override the rhythm) */}
      {s.events.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Today&apos;s Events</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s.events.map(e => (
              <div key={e.id} className="card2" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderColor: 'var(--accent)', borderRadius: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', minWidth: 62 }}>{e.start_min != null ? fmtClock(e.start_min) : 'All day'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', flex: 1 }}>{e.title}</span>
                {e.location && <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{e.location}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="section-label" style={{ marginBottom: 12 }}>The Rhythm</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {s.blocks.map(b => {
          const isNow = s.current?.id === b.id
          const isPast = s.nowMin >= b.end_min
          const color = PILLAR_COLORS[b.pillar] ?? 'var(--muted)'
          return (
            <div key={b.id} style={{
              display: 'flex', gap: 12, padding: '13px 14px',
              background: isNow ? 'var(--accent-dim)' : 'var(--surface)',
              border: `1px solid ${isNow ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 14, opacity: isPast && !isNow ? 0.45 : 1,
            }}>
              <div style={{ minWidth: 62, fontSize: 12, fontWeight: 700, color: isNow ? 'var(--accent)' : 'var(--foreground-2)', paddingTop: 1 }}>
                {fmtClock(b.start_min)}
              </div>
              <div className="tl-bar" style={{ background: color, minHeight: 34 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{b.title}</span>
                  {b.theme && <span style={{ fontSize: 12, fontWeight: 600, color }}>· {b.theme}</span>}
                  {isNow && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)' }}>● NOW</span>}
                  <span className="pillar-tag" style={{ color, background: `${color}1f`, marginLeft: 'auto' }}>{b.pillar}</span>
                </div>
                {b.detail && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45, marginTop: 4 }}>{b.detail}</div>}
                {b.identity && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>identity: {b.identity}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* The Three Rules */}
      {rules.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>The Three Rules</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {rules.map(r => (
              <div key={r.n} className="card2" style={{ borderRadius: 16 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.02em' }}>{r.n}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', margin: '10px 0 4px' }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{r.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Philosophy */}
      {philosophy && (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6, marginTop: 28, borderLeft: '2px solid var(--accent)', paddingLeft: 14 }}>
          {philosophy}
        </div>
      )}
    </div>
  )
}

function NowCard({ label, block, accent }: { label: string; block: Block | null; accent?: boolean }) {
  const color = block ? (PILLAR_COLORS[block.pillar] ?? 'var(--muted)') : 'var(--muted)'
  return (
    <div className="card2" style={{ borderColor: accent ? 'var(--accent)' : 'var(--border)', borderRadius: 16 }}>
      <div className="section-label" style={{ color: accent ? 'var(--accent)' : 'var(--muted)', marginBottom: 8 }}>{label}</div>
      {block ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>{block.title}</span>
            {block.theme && <span style={{ fontSize: 12, fontWeight: 600, color }}>· {block.theme}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{fmtClock(block.start_min)} – {fmtClock(block.end_min)}</span>
            <span className="pillar-tag" style={{ color, background: `${color}1f` }}>{block.pillar}</span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>{label === 'RIGHT NOW' ? 'Transition / open' : 'Day complete — rest'}</div>
      )}
    </div>
  )
}
