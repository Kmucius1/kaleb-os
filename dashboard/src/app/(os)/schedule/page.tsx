import { getTodaySchedule, fmtClock, PILLAR_COLORS, type Block } from '@/lib/schedule'
import { supabase } from '@/lib/supabase'
import { CalendarDays, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

const DAY_LABEL: Record<string, string> = { weekday: 'Weekday', saturday: 'Saturday', sunday: 'Sunday · Reset Day' }
const DOW_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
    <div style={{ padding: '24px 28px', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <CalendarDays size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>SCHEDULE</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{DOW_NAME[s.dow]} · {DAY_LABEL[s.dayType]} · {fmtClock(s.nowMin)} ET</span>
      </div>
      {philosophy && (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 20, borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
          {philosophy}
        </div>
      )}

      {/* Now / Next strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <NowCard label="RIGHT NOW" block={s.current} />
        <NowCard label="UP NEXT" block={s.next} />
      </div>

      {/* Today's events (one-offs override the rhythm) */}
      {s.events.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>TODAY&apos;S EVENTS</SectionLabel>
          {s.events.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', minWidth: 68 }}>{e.start_min != null ? fmtClock(e.start_min) : 'All day'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', flex: 1 }}>{e.title}</span>
              {e.location && <span style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{e.location}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <SectionLabel>THE RHYTHM</SectionLabel>
      <div style={{ position: 'relative' }}>
        {s.blocks.map(b => {
          const isNow = s.current?.id === b.id
          const isPast = s.nowMin >= b.end_min
          const color = PILLAR_COLORS[b.pillar] ?? 'var(--muted)'
          return (
            <div key={b.id} style={{
              display: 'flex', gap: 14, padding: '11px 14px', marginBottom: 6,
              background: isNow ? 'var(--accent-dim)' : 'var(--surface)',
              border: `1px solid ${isNow ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 6, opacity: isPast && !isNow ? 0.45 : 1,
            }}>
              <div style={{ minWidth: 74, fontSize: 11, fontWeight: 700, color: isNow ? 'var(--accent)' : 'var(--foreground-2)', paddingTop: 1 }}>
                {fmtClock(b.start_min)}
              </div>
              <div style={{ width: 3, borderRadius: 2, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' }}>{b.title}</span>
                  {b.theme && <span style={{ fontSize: 11, fontWeight: 600, color }}>· {b.theme}</span>}
                  <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color, background: `${color}1a`, padding: '2px 6px', borderRadius: 4 }}>{b.pillar.toUpperCase()}</span>
                  {b.identity && <span style={{ fontSize: 9, color: 'var(--muted)' }}>identity: {b.identity}</span>}
                  {isNow && <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)' }}>● NOW</span>}
                </div>
                {b.detail && <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45, marginTop: 4 }}>{b.detail}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* The Three Rules */}
      {rules.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SectionLabel>THE THREE RULES</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {rules.map(r => (
              <div key={r.n} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{r.n}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--foreground)', margin: '8px 0 4px' }}>{r.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>{r.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 12 }}>{children}</div>
}

function NowCard({ label, block }: { label: string; block: Block | null }) {
  const color = block ? (PILLAR_COLORS[block.pillar] ?? 'var(--muted)') : 'var(--muted)'
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${label === 'RIGHT NOW' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
      {block ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>{block.title}</span>
            {block.theme && <span style={{ fontSize: 12, fontWeight: 600, color }}>· {block.theme}</span>}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{fmtClock(block.start_min)} – {fmtClock(block.end_min)} · {block.pillar}</div>
        </>
      ) : (
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>{label === 'RIGHT NOW' ? 'Transition / open' : 'Day complete — rest'}</div>
      )}
    </div>
  )
}
