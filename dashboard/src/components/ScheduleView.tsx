'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, MapPin, CalendarDays } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { blockIcon } from '@/lib/blockIcon'
import { fmtClock, PILLAR_COLORS, etNowMinutes } from '@/lib/clock'
import type { Block, SchedEvent, DaySchedule } from '@/lib/schedule'

type View = 'day' | 'week' | 'month'

// ---- pure date-string helpers (ET calendar dates, noon-UTC anchored) ----
const todayET = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
const asDate = (s: string) => new Date(`${s}T12:00:00Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)
function addDays(s: string, n: number) { const d = asDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
function addMonths(s: string, n: number) { const d = asDate(s); d.setUTCMonth(d.getUTCMonth() + n); return iso(d) }
const dow = (s: string) => asDate(s).getUTCDay()
function weekStart(s: string) { return addDays(s, -dow(s)) } // Sunday
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: 'UTC' }).format(asDate(s))
const DOW_S = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function ScheduleView({ initial }: { initial: DaySchedule }) {
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState<string>(initial.dateStr)
  const [day, setDay] = useState<DaySchedule>(initial)
  const [loading, setLoading] = useState(false)
  const [nowMin, setNowMin] = useState(() => etNowMinutes())
  const isToday = date === todayET()

  // Tick so the NOW marker stays accurate on the live day.
  useEffect(() => { const id = setInterval(() => setNowMin(etNowMinutes()), 30_000); return () => clearInterval(id) }, [])

  // Load the selected day whenever it changes (skip if already loaded).
  const loadDay = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/schedule/day?date=${d}`, { cache: 'no-store' })
      if (res.ok) setDay(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (view !== 'day') return
    if (date === day.dateStr) return
    loadDay(date)
  }, [date, view, day.dateStr, loadDay])

  function openDay(d: string) { setDate(d); setView('day') }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px', position: 'relative' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Schedule</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><CalendarDays size={18} color="var(--accent)" /></span>
      </div>

      {/* Day / Week / Month */}
      <div className="seg rise rise-1" style={{ marginBottom: 14 }}>
        {(['day', 'week', 'month'] as View[]).map(v => (
          <button key={v} className={`seg-item${view === v ? ' active' : ''}`} onClick={() => setView(v)}
            style={{ border: 'none', background: view === v ? undefined : 'transparent', textTransform: 'capitalize' }}>{v}</button>
        ))}
      </div>

      {view === 'day' && <DayPanel date={date} setDate={setDate} isToday={isToday} day={day} loading={loading} nowMin={nowMin} onToday={() => setDate(todayET())} onToggle={(id, t, done) => {
        // optimistic
        setDay(d => ({ ...d, completed: done ? [...d.completed, id] : d.completed.filter(x => x !== id) }))
        fetch('/api/schedule/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref_id: id, ref_type: t, date, done }) }).catch(() => {})
      }} />}

      {view === 'week' && <WeekPanel date={date} setDate={setDate} openDay={openDay} />}
      {view === 'month' && <MonthPanel date={date} setDate={setDate} openDay={openDay} />}
    </div>
  )
}

/* ------------------------------- DAY ------------------------------- */
function DayPanel({ date, setDate, isToday, day, loading, nowMin, onToday, onToggle }: {
  date: string; setDate: (s: string) => void; isToday: boolean; day: DaySchedule; loading: boolean; nowMin: number
  onToday: () => void; onToggle: (id: string, refType: string, done: boolean) => void
}) {
  const doneSet = new Set(day.completed)
  type Item = { kind: 'block'; b: Block } | { kind: 'event'; e: SchedEvent }
  const items: Item[] = [
    ...day.blocks.map((b): Item => ({ kind: 'block', b })),
    ...day.events.filter(e => e.start_min != null).map((e): Item => ({ kind: 'event', e })),
  ].sort((a, b) => (a.kind === 'block' ? a.b.start_min : a.e.start_min!) - (b.kind === 'block' ? b.b.start_min : b.e.start_min!))

  return (
    <>
      <div className="pcard rise rise-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 18 }}>
        <button onClick={() => setDate(addDays(date, -1))} className="press" style={navBtn}><ChevronLeft size={18} color="var(--foreground-2)" /></button>
        <button onClick={onToday} className="press" style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{isToday ? 'Today' : fmt(date, { weekday: 'long' })} · {fmt(date, { month: 'long', day: 'numeric' })}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{isToday ? `${fmtClock(nowMin)} ET` : 'tap for today'}</div>
        </button>
        <button onClick={() => setDate(addDays(date, 1))} className="press" style={navBtn}><ChevronRight size={18} color="var(--foreground-2)" /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: loading ? 0.5 : 1, transition: 'opacity .15s' }}>
        {items.map((it, idx) => it.kind === 'event'
          ? <EventRow key={'e' + it.e.id} e={it.e} done={doneSet.has(it.e.id)} onToggle={d => onToggle(it.e.id, 'event', d)} />
          : <BlockRow key={it.b.id} b={it.b} i={idx} isNow={isToday && nowMin >= it.b.start_min && nowMin < it.b.end_min} done={doneSet.has(it.b.id)} onToggle={d => onToggle(it.b.id, 'block', d)} />)}
      </div>
    </>
  )
}

function BlockRow({ b, i, isNow, done, onToggle }: { b: Block; i: number; isNow: boolean; done: boolean; onToggle: (done: boolean) => void }) {
  const color = PILLAR_COLORS[b.pillar] ?? 'var(--muted)'
  const Icon = blockIcon(b.title)
  return (
    <div className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px', position: 'relative', overflow: 'hidden',
      borderColor: isNow ? color : 'var(--border)', opacity: done && !isNow ? 0.62 : 1,
      background: isNow ? `color-mix(in srgb, ${color} 9%, var(--surface))` : undefined,
    }}>
      <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: color }} />
      <span className="grad-icon" style={{ width: 40, height: 40, background: `${color}1c`, borderRadius: 12, flexShrink: 0 }}><Icon size={20} color={color} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{fmtClock(b.start_min)} – {fmtClock(b.end_min)}</span>
          <span className="pillar-tag" style={{ color, background: `${color}1f`, marginLeft: 'auto' }}>{b.pillar}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginTop: 2, textDecoration: done ? 'line-through' : 'none', textDecorationColor: `${color}99` }}>{b.title}{b.theme ? <span style={{ color, fontWeight: 600 }}> · {b.theme}</span> : null}</div>
        {b.detail && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.detail}</div>}
      </div>
      <CheckToggle color={color} done={done} isNow={isNow} onToggle={onToggle} />
    </div>
  )
}

function EventRow({ e, done, onToggle }: { e: SchedEvent; done: boolean; onToggle: (done: boolean) => void }) {
  return (
    <div className="pcard rise" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px', position: 'relative', borderColor: 'var(--accent)', opacity: done ? 0.62 : 1 }}>
      <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: 'var(--accent)' }} />
      <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 12, flexShrink: 0 }}><CalendarDays size={19} color="var(--accent)" /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{e.start_min != null ? fmtClock(e.start_min) : 'All day'}{e.end_min != null ? ` – ${fmtClock(e.end_min)}` : ''}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginTop: 2, textDecoration: done ? 'line-through' : 'none' }}>{e.title}</div>
        {e.location && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{e.location}</div>}
      </div>
      <CheckToggle color="var(--accent)" done={done} isNow={false} onToggle={onToggle} />
    </div>
  )
}

function CheckToggle({ color, done, isNow, onToggle }: { color: string; done: boolean; isNow: boolean; onToggle: (done: boolean) => void }) {
  return (
    <button onClick={() => onToggle(!done)} title={done ? 'Mark not done' : 'Mark done'} className="press" style={{
      flexShrink: 0, width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: done ? 'none' : `1.6px solid ${isNow ? color : 'var(--border-2)'}`,
      background: done ? color : 'transparent', transition: 'all .15s',
    }}>
      {done ? <Check size={16} color="#0a0b0f" strokeWidth={3} /> : isNow ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} /> : null}
    </button>
  )
}

/* ------------------------------- WEEK ------------------------------- */
function WeekPanel({ date, setDate, openDay }: { date: string; setDate: (s: string) => void; openDay: (s: string) => void }) {
  const start = weekStart(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const [agg, setAgg] = useState<{ eventsByDate: Record<string, { title: string; start_min: number | null }[]>; adherence: Record<string, number> }>({ eventsByDate: {}, adherence: {} })
  const today = todayET()
  useEffect(() => {
    fetch(`/api/schedule/range?from=${days[0]}&to=${days[6]}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).then(d => d && setAgg(d)).catch(() => {})
  }, [days[0], days[6]]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PeriodNav label={`Week of ${fmt(start, { month: 'short', day: 'numeric' })}`} onPrev={() => setDate(addDays(date, -7))} onNext={() => setDate(addDays(date, 7))} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {days.map(d => {
          const evs = agg.eventsByDate[d] ?? []
          const pct = agg.adherence[d] ?? 0
          const isToday = d === today
          return (
            <button key={d} onClick={() => openDay(d)} className="pcard press" style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', borderColor: isToday ? 'var(--accent)' : 'var(--border)' }}>
              <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: isToday ? 'var(--accent)' : 'var(--muted)' }}>{fmt(d, { weekday: 'short' }).toUpperCase()}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>{fmt(d, { day: 'numeric' })}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {evs.length === 0
                  ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>Daily rhythm{isToday ? ' · today' : ''}</div>
                  : evs.slice(0, 3).map((e, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--foreground-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{e.start_min != null ? fmtClock(e.start_min) : 'All day'}</span> · {e.title}
                    </div>
                  ))}
                {evs.length > 3 && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>+{evs.length - 3} more</div>}
              </div>
              <ProgressRing pct={pct} size={40} stroke={4} color="var(--green)">
                <span style={{ fontSize: 10, fontWeight: 800 }}>{pct}%</span>
              </ProgressRing>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------- MONTH ------------------------------- */
function MonthPanel({ date, setDate, openDay }: { date: string; setDate: (s: string) => void; openDay: (s: string) => void }) {
  const first = date.slice(0, 8) + '01'
  const y = asDate(first).getUTCFullYear(), m = asDate(first).getUTCMonth()
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const lead = dow(first)
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => iso(new Date(Date.UTC(y, m, i + 1, 12))))]
  const gridEnd = cells[cells.length - 1] as string
  const [agg, setAgg] = useState<{ eventsByDate: Record<string, unknown[]>; adherence: Record<string, number> }>({ eventsByDate: {}, adherence: {} })
  const today = todayET()
  useEffect(() => {
    fetch(`/api/schedule/range?from=${first}&to=${gridEnd}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).then(d => d && setAgg(d)).catch(() => {})
  }, [first, gridEnd])

  return (
    <>
      <PeriodNav label={fmt(first, { month: 'long', year: 'numeric' })} onPrev={() => setDate(addMonths(date, -1))} onNext={() => setDate(addMonths(date, 1))} />
      <div className="pcard rise rise-2" style={{ padding: '12px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
          {DOW_S.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const hasEvent = (agg.eventsByDate[d]?.length ?? 0) > 0
            const pct = agg.adherence[d] ?? 0
            const isToday = d === today
            const isSel = d === date
            return (
              <button key={i} onClick={() => openDay(d)} className="press" style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                border: isSel ? '1.5px solid var(--accent)' : isToday ? '1.5px solid var(--border-2)' : '1px solid transparent',
                borderRadius: 10, cursor: 'pointer',
                background: pct > 0 ? `color-mix(in srgb, var(--green) ${Math.round(pct * 0.4)}%, transparent)` : 'transparent',
              }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--accent)' : 'var(--foreground)' }}>{Number(d.slice(8, 10))}</span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: hasEvent ? 'var(--accent)' : 'transparent' }} />
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} /> Has events</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'color-mix(in srgb, var(--green) 40%, transparent)' }} /> Completed</span>
      </div>
    </>
  )
}

function PeriodNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="pcard rise rise-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 16 }}>
      <button onClick={onPrev} className="press" style={navBtn}><ChevronLeft size={18} color="var(--foreground-2)" /></button>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
      <button onClick={onNext} className="press" style={navBtn}><ChevronRight size={18} color="var(--foreground-2)" /></button>
    </div>
  )
}

const navBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }
