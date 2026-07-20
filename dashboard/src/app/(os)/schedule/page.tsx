import { getTodaySchedule, fmtClock, PILLAR_COLORS, type Block, type SchedEvent } from '@/lib/schedule'
import { blockIcon } from '@/lib/blockIcon'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays, Check, Plus, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

const DOW_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function todayLabel() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }).format(new Date())
}

type Item = { kind: 'block'; b: Block } | { kind: 'event'; e: SchedEvent }

export default async function SchedulePage() {
  const s = await getTodaySchedule()
  const items: Item[] = [
    ...s.blocks.map((b): Item => ({ kind: 'block', b })),
    ...s.events.filter(e => e.start_min != null).map((e): Item => ({ kind: 'event', e })),
  ].sort((a, b) => (a.kind === 'block' ? a.b.start_min : a.e.start_min!) - (b.kind === 'block' ? b.b.start_min : b.e.start_min!))

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px', position: 'relative' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Schedule</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><CalendarDays size={18} color="var(--accent)" /></span>
      </div>

      {/* Segmented */}
      <div className="seg rise rise-1" style={{ marginBottom: 14 }}>
        <span className="seg-item active">Day</span>
        <span className="seg-item">Week</span>
        <span className="seg-item">Month</span>
      </div>

      {/* Date nav */}
      <div className="pcard rise rise-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 18 }}>
        <ChevronLeft size={18} color="var(--muted)" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Today · {todayLabel()}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{DOW_NAME[s.dow]} · {fmtClock(s.nowMin)} ET</div>
        </div>
        <ChevronRight size={18} color="var(--muted)" />
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, idx) => it.kind === 'event'
          ? <EventRow key={'e' + it.e.id} e={it.e} i={idx} />
          : <BlockRow key={it.b.id} b={it.b} now={s.nowMin} isNow={s.current?.id === it.b.id} i={idx} />)}
      </div>

      {/* FAB → add via Atlas */}
      <Link href="/" className="press" title="Add to schedule" style={{
        position: 'fixed', right: 20, bottom: 84, width: 54, height: 54, borderRadius: 18,
        background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 30px -6px color-mix(in srgb, var(--accent) 70%, transparent)', zIndex: 50,
      }}>
        <Plus size={24} color="#fff" />
      </Link>
    </div>
  )
}

function BlockRow({ b, now, isNow, i }: { b: Block; now: number; isNow: boolean; i: number }) {
  const color = PILLAR_COLORS[b.pillar] ?? 'var(--muted)'
  const Icon = blockIcon(b.title)
  const isPast = now >= b.end_min
  return (
    <div className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px', position: 'relative', overflow: 'hidden',
      borderColor: isNow ? color : 'var(--border)', opacity: isPast && !isNow ? 0.5 : 1,
      background: isNow ? `color-mix(in srgb, ${color} 9%, var(--surface))` : undefined,
    }}>
      <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: color }} />
      <span className="grad-icon" style={{ width: 40, height: 40, background: `${color}1c`, borderRadius: 12, flexShrink: 0 }}><Icon size={20} color={color} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{fmtClock(b.start_min)} – {fmtClock(b.end_min)}</span>
          <span className="pillar-tag" style={{ color, background: `${color}1f`, marginLeft: 'auto' }}>{b.pillar}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginTop: 2 }}>{b.title}{b.theme ? <span style={{ color, fontWeight: 600 }}> · {b.theme}</span> : null}</div>
        {b.detail && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.detail}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>
        {isNow
          ? <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', color, background: `${color}22`, padding: '4px 8px', borderRadius: 8 }}>NOW</span>
          : isPast
            ? <span style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color={color} /></span>
            : <span style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid var(--border-2)', display: 'block' }} />}
      </div>
    </div>
  )
}

function EventRow({ e }: { e: SchedEvent; i: number }) {
  return (
    <div className="pcard rise" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px', position: 'relative', borderColor: 'var(--accent)' }}>
      <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: 'var(--accent)' }} />
      <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 12, flexShrink: 0 }}><CalendarDays size={19} color="var(--accent)" /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{e.start_min != null ? fmtClock(e.start_min) : 'All day'}{e.end_min != null ? ` – ${fmtClock(e.end_min)}` : ''}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginTop: 2 }}>{e.title}</div>
        {e.location && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{e.location}</div>}
      </div>
    </div>
  )
}
