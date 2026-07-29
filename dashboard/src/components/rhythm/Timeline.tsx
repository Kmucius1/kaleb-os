'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Check, ChevronLeft, ChevronRight, List as ListIcon, Lock, MapPin, Minus, Move, Plus, Sparkles,
  Sunrise, Sunset, Waves,
} from 'lucide-react'
import { blockIcon } from '@/lib/blockIcon'
import { pillarColor } from '@/lib/rhythm/pillars'
import { fmtMin } from '@/lib/rhythm/engine'
import RebalanceSheet from './RebalanceSheet'
import TimeGrid from './TimeGrid'
import type { PlannedBlock } from '@/lib/rhythm/types'
import type { ResolvedDay } from '@/lib/rhythm/day'

type View = 'now' | 'day' | 'week' | 'month'

const TZ = 'America/New_York'
const todayET = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const asDate = (s: string) => new Date(`${s}T12:00:00Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (s: string, n: number) => { const d = asDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const addMonths = (s: string, n: number) => { const d = asDate(s); d.setUTCMonth(d.getUTCMonth() + n); return iso(d) }
const dow = (s: string) => asDate(s).getUTCDay()
const fmtDate = (s: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...o, timeZone: 'UTC' }).format(asDate(s))
const etNow = () => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
  return (Number(p.find(x => x.type === 'hour')?.value ?? 0) % 24) * 60 + Number(p.find(x => x.type === 'minute')?.value ?? 0)
}

export default function Timeline({ initial }: { initial: ResolvedDay }) {
  const params = useSearchParams()
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(initial.dateStr)
  const [day, setDay] = useState<ResolvedDay>(initial)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(initial.nowMin)
  const [sheet, setSheet] = useState(params.get('rebalance') === '1')
  const isToday = date === todayET()

  useEffect(() => { const id = setInterval(() => setNow(etNow()), 30_000); return () => clearInterval(id) }, [])

  const load = useCallback(async (d: string) => {
    setLoading(true); setFailed(false)
    try {
      const res = await fetch(`/api/rhythm/day?date=${d}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load failed')
      setDay(await res.json())
    } catch { setFailed(true) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (view === 'week' || view === 'month') return
    if (date === day.dateStr) return
    load(date)
  }, [date, view, day.dateStr, load])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      <header className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Schedule</h1>
        <button
          onClick={() => setSheet(true)}
          className="press"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 14px',
            borderRadius: 12, background: 'var(--accent-dim)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
            color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Sparkles size={14} />Rebalance
        </button>
      </header>

      <div className="seg rise rise-1" style={{ marginBottom: 14 }} role="tablist">
        {(['now', 'day', 'week', 'month'] as View[]).map(v => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={`seg-item${view === v ? ' active' : ''}`}
            onClick={() => { setView(v); if (v === 'now') setDate(todayET()) }}
            style={{ border: 'none', background: view === v ? undefined : 'transparent', textTransform: 'capitalize', minHeight: 40 }}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'now' && <NowView day={day} now={now} onChange={() => load(date)} />}
      {view === 'day' && (
        <DayView
          date={date} setDate={setDate} isToday={isToday} day={day} now={now}
          loading={loading} failed={failed} onRetry={() => load(date)} onChange={() => load(date)}
        />
      )}
      {view === 'week' && <WeekView date={date} setDate={setDate} openDay={d => { setDate(d); setView('day') }} />}
      {view === 'month' && <MonthView date={date} setDate={setDate} openDay={d => { setDate(d); setView('day') }} />}

      <RebalanceSheet open={sheet} onClose={() => { setSheet(false); load(date) }} />
    </div>
  )
}

/* ---------------------------------- NOW ---------------------------------- */

function NowView({ day, now, onChange }: { day: ResolvedDay; now: number; onChange: () => void }) {
  const current = day.blocks.find(b => now >= b.start && now < b.end && b.status !== 'skipped')
  const rest = day.blocks.filter(b => b.start > now && b.status !== 'skipped').slice(0, 3)
  const openWindow = !current && rest.length > 0 ? rest[0].start - now : 0

  return (
    <>
      {current ? (
        <BlockRow block={current} now={now} date={day.dateStr} isNow onChange={onChange} expanded />
      ) : (
        <div className="pcard rise rise-2" style={{ marginBottom: 14 }}>
          <div className="label" style={{ marginBottom: 6 }}>Open window</div>
          <div style={{ fontSize: 15, color: 'var(--foreground-2)' }}>
            {openWindow > 0 ? `${openWindow} minutes free before ${rest[0].title}.` : 'Nothing scheduled.'}
          </div>
        </div>
      )}
      <div className="label" style={{ margin: '18px 4px 10px' }}>Then</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rest.map(b => <BlockRow key={b.key} block={b} now={now} date={day.dateStr} onChange={onChange} />)}
      </div>
    </>
  )
}

/* ---------------------------------- DAY ---------------------------------- */

function DayView({ date, setDate, isToday, day, now, loading, failed, onRetry, onChange }: {
  date: string; setDate: (s: string) => void; isToday: boolean; day: ResolvedDay; now: number
  loading: boolean; failed: boolean; onRetry: () => void; onChange: () => void
}) {
  // Grid is where you reshape the day; list is where you read and tick it off.
  const [layout, setLayout] = useState<'list' | 'grid'>('list')
  const conflictKeys = new Set(day.conflicts.flatMap(c => [c.a, c.b]))
  const items = [...day.blocks].sort((a, b) => a.start - b.start)

  // Sun markers slot into the list at the right point in the day.
  type Row = { at: number; node: React.ReactNode; key: string }
  const rows: Row[] = items.map(b => ({
    at: b.start,
    key: b.key,
    node: (
      <BlockRow
        key={b.key} block={b} now={now} date={date} onChange={onChange}
        isNow={isToday && now >= b.start && now < b.end}
        conflicted={conflictKeys.has(b.key)}
      />
    ),
  }))
  for (const [label, at, Icon] of [
    ['Sunrise', day.sun.sunriseMin, Sunrise] as const,
    ['Sunset', day.sun.sunsetMin, Sunset] as const,
  ]) {
    rows.push({
      at, key: label,
      node: <SunMarker key={label} label={label} at={at} icon={Icon} estimated={day.sun.estimated} />,
    })
  }
  rows.sort((a, b) => a.at - b.at)

  return (
    <>
      <div className="pcard rise rise-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 16 }}>
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day" className="press" style={navBtn}>
          <ChevronLeft size={18} color="var(--foreground-2)" />
        </button>
        <button onClick={() => setDate(todayET())} className="press" style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {isToday ? 'Today' : fmtDate(date, { weekday: 'long' })} · {fmtDate(date, { month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>
            {isToday ? `${fmtMin(now)} ET` : 'tap for today'}
          </div>
        </button>
        <button onClick={() => setDate(addDays(date, 1))} aria-label="Next day" className="press" style={navBtn}>
          <ChevronRight size={18} color="var(--foreground-2)" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['list', 'grid'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLayout(l)}
            aria-pressed={layout === l}
            className="press"
            style={{
              flex: 1, minHeight: 40, borderRadius: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: layout === l ? 'var(--accent-dim)' : 'var(--surface)',
              border: `1px solid ${layout === l ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border)'}`,
              color: layout === l ? 'var(--accent)' : 'var(--foreground-2)',
              fontSize: 12.5, fontWeight: 600,
            }}
          >
            {l === 'list' ? <><ListIcon size={14} />List</> : <><Move size={14} />Drag</>}
          </button>
        ))}
      </div>

      {failed && (
        <div className="pcard" style={{ marginBottom: 12, textAlign: 'center', padding: 20 }}>
          <p style={{ fontSize: 13.5, color: 'var(--foreground-2)', margin: '0 0 12px' }}>Couldn’t load this day.</p>
          <button onClick={onRetry} className="press" style={{
            minHeight: 40, padding: '0 18px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 13,
          }}>Try again</button>
        </div>
      )}

      {loading && !failed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="skel" style={{ height: 74 }} />)}
        </div>
      )}

      {!loading && !failed && layout === 'grid' && (
        <TimeGrid day={day} nowMin={now} isToday={isToday} onChanged={onChange} />
      )}

      {!loading && !failed && layout === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => r.node)}
          {rows.length === 0 && (
            <div className="pcard" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>
              Nothing scheduled for this day.
            </div>
          )}
        </div>
      )}
    </>
  )
}

function SunMarker({ label, at, icon: Icon, estimated }: { label: string; at: number; icon: React.ElementType; estimated: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 6px' }} aria-label={`${label} ${fmtMin(at)}`}>
      <Icon size={13} color="var(--money)" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--money)' }}>
        {label} {fmtMin(at)}{estimated ? ' ~' : ''}
      </span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, color-mix(in srgb, var(--money) 35%, transparent), transparent)' }} />
    </div>
  )
}

function BlockRow({ block, now, date, isNow = false, conflicted = false, expanded = false, onChange }: {
  block: PlannedBlock; now: number; date: string; isNow?: boolean; conflicted?: boolean; expanded?: boolean; onChange: () => void
}) {
  const [open, setOpen] = useState(expanded)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const color = pillarColor(block.pillar)
  const Icon = block.key === 'horizon' ? Waves : blockIcon(block.title)
  const done = block.status === 'done'
  const skipped = block.status === 'skipped'
  const missed = !done && !skipped && block.end < now && date === todayET()

  async function post(url: string, body: unknown) {
    setBusy(true)
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      onChange(); router.refresh()
    } finally { setBusy(false) }
  }

  const nudge = (mins: number) =>
    post('/api/rhythm/rebalance', { apply: true, disruption: { key: block.key, newEnd: block.end + mins } })

  return (
    <div
      className="pcard"
      style={{
        padding: '13px 15px 13px 13px', position: 'relative', overflow: 'hidden',
        borderColor: conflicted ? 'var(--red)' : isNow ? color : 'var(--border)',
        background: isNow ? `color-mix(in srgb, ${color} 9%, var(--surface))` : undefined,
        opacity: skipped ? 0.5 : done && !isNow ? 0.62 : 1,
        borderStyle: block.flexibility === 'movable' ? 'dashed' : 'solid',
      }}
    >
      <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: color, opacity: block.flexibility === 'protected' ? 1 : 0.45 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span className="grad-icon" style={{ width: 40, height: 40, background: `${color}1c`, borderRadius: 12, flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </span>

        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="tabular" style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
              {fmtMin(block.start)} – {fmtMin(block.end)}
            </span>
            {block.locked && <Lock size={10} color="var(--muted)" />}
            <span className="pillar-tag" style={{ color, background: `${color}1f`, marginLeft: 'auto' }}>{block.pillar}</span>
          </div>
          <div style={{
            fontSize: 15, fontWeight: 700, marginTop: 2,
            textDecoration: done || skipped ? 'line-through' : 'none', textDecorationColor: `${color}99`,
          }}>
            {block.title}
          </div>
          <div style={{ fontSize: 11.5, color: missed ? 'var(--yellow)' : 'var(--muted)', marginTop: 2 }}>
            {skipped ? (block.reason ?? 'Skipped') : missed ? 'Missed' : block.flexibility === 'protected' ? 'Protected' : block.flexibility === 'flexible' ? 'Flexible' : 'Movable'}
            {block.movedFrom && ` · moved from ${fmtMin(block.movedFrom.start)}`}
            {conflicted && <span style={{ color: 'var(--red)' }}> · conflict</span>}
          </div>
        </button>

        <button
          onClick={() => post('/api/rhythm/complete', { key: block.key, done: !done, date })}
          disabled={busy}
          aria-label={done ? `Mark ${block.title} not done` : `Mark ${block.title} done`}
          className="press"
          style={{
            flexShrink: 0, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: done ? 'none' : `1.6px solid ${isNow ? color : 'var(--border-2)'}`,
            background: done ? color : 'transparent', opacity: busy ? 0.5 : 1,
          }}
        >
          {done ? <Check size={17} color="#0a0b0f" strokeWidth={3} /> : isNow ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} /> : null}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {block.detail && (
            <p style={{ fontSize: 12.5, color: 'var(--foreground-2)', margin: '0 0 10px', lineHeight: 1.45 }}>{block.detail}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11.5, color: 'var(--muted)', marginBottom: 12 }}>
            <span>{block.end - block.start} min</span>
            {block.minMinutes && <span>min {block.minMinutes}</span>}
            <span>energy {block.energy}</span>
            {block.location && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{block.location}</span>}
            {block.travelMinutes ? <span>{block.travelMinutes} min travel</span> : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SmallBtn label="15m earlier" icon={Minus} onClick={() => nudge(-15)} disabled={busy || block.flexibility === 'protected'} />
            <SmallBtn label="15m later" icon={Plus} onClick={() => nudge(15)} disabled={busy || block.flexibility === 'protected'} />
            <SmallBtn
              label={block.locked ? 'Unlock' : 'Lock'}
              icon={Lock}
              onClick={() => post('/api/rhythm/day', { key: block.key, date })}
              disabled={busy}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SmallBtn({ label, icon: Icon, onClick, disabled }: { label: string; icon: React.ElementType; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="press" style={{
      flex: 1, minHeight: 40, borderRadius: 11, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--foreground-2)',
      fontSize: 11.5, fontWeight: 600, opacity: disabled ? 0.4 : 1,
    }}>
      <Icon size={13} />{label}
    </button>
  )
}

/* ---------------------------------- WEEK ---------------------------------- */

const PILLAR_KEYS: { key: string; label: string }[] = [
  { key: 'trading', label: 'Trading' },
  { key: 'gym', label: 'Gym' },
  { key: 'horizon', label: 'Horizon' },
  { key: 'meditation-am', label: 'Meditate' },
  { key: 'journal-am', label: 'Journal' },
  { key: 'content', label: 'Content' },
  { key: 'dryp', label: 'DRYP' },
  { key: 'sleep', label: 'Sleep' },
]

function WeekView({ date, setDate, openDay }: { date: string; setDate: (s: string) => void; openDay: (s: string) => void }) {
  const [data, setData] = useState<{ dates: string[]; completedByDate: Record<string, string[]>; horizon: string[]; today: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    fetch(`/api/rhythm/day?week=${date}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(setData)
      .catch(() => setFailed(true))
  }, [date])

  const start = addDays(date, -dow(date))

  return (
    <>
      <PeriodNav
        label={`Week of ${fmtDate(start, { month: 'short', day: 'numeric' })}`}
        onPrev={() => setDate(addDays(date, -7))}
        onNext={() => setDate(addDays(date, 7))}
      />

      {failed && <div className="pcard" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>Couldn’t load the week.</div>}
      {!data && !failed && <div className="skel" style={{ height: 280 }} />}

      {data && (
        <>
          <div className="pcard rise rise-2" style={{ padding: '14px 12px', marginBottom: 12, overflowX: 'auto' }}>
            <div style={{ minWidth: 300 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '76px repeat(7, 1fr)', gap: 3, marginBottom: 8 }}>
                <span />
                {data.dates.map(d => (
                  <span key={d} style={{
                    textAlign: 'center', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
                    color: d === data.today ? 'var(--accent)' : 'var(--muted)',
                  }}>
                    {fmtDate(d, { weekday: 'narrow' })}
                  </span>
                ))}
              </div>
              {PILLAR_KEYS.map(row => (
                <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '76px repeat(7, 1fr)', gap: 3, marginBottom: 3, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--foreground-2)' }}>{row.label}</span>
                  {data.dates.map(d => {
                    const hit = row.key === 'horizon'
                      ? data.horizon.includes(d)
                      : (data.completedByDate[d] ?? []).includes(row.key)
                    const future = d > data.today
                    return (
                      <button
                        key={d}
                        onClick={() => openDay(d)}
                        aria-label={`${row.label} ${d}${hit ? ' done' : ''}`}
                        style={{
                          height: 22, borderRadius: 6, cursor: 'pointer', border: 'none',
                          background: hit ? 'var(--accent)' : future ? 'var(--surface-2)' : 'var(--surface-3)',
                          opacity: future ? 0.5 : 1,
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="pcard rise rise-3" style={{ padding: '14px 16px' }}>
            <div className="label" style={{ marginBottom: 8 }}>Horizon Walk</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {data.horizon.length}<span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}> / 7</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
              Floor is five. {data.horizon.length >= 5 ? 'Cleared.' : `${5 - data.horizon.length} more to clear it.`}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* --------------------------------- MONTH --------------------------------- */

function MonthView({ date, setDate, openDay }: { date: string; setDate: (s: string) => void; openDay: (s: string) => void }) {
  const first = date.slice(0, 8) + '01'
  const y = asDate(first).getUTCFullYear(), m = asDate(first).getUTCMonth()
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const lead = dow(first)
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(new Date(Date.UTC(y, m, i + 1, 12)))),
  ]
  const [horizon, setHorizon] = useState<string[]>([])
  const today = todayET()

  useEffect(() => {
    const last = cells[cells.length - 1] as string
    fetch(`/api/rhythm/day?week=${first}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setHorizon(d.horizon))
      .catch(() => {})
    void last
  }, [first]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PeriodNav
        label={fmtDate(first, { month: 'long', year: 'numeric' })}
        onPrev={() => setDate(addMonths(date, -1))}
        onNext={() => setDate(addMonths(date, 1))}
      />
      <div className="pcard rise rise-2" style={{ padding: '12px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const isToday = d === today
            const walked = horizon.includes(d)
            return (
              <button key={i} onClick={() => openDay(d)} className="press" style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                border: d === date ? '1.5px solid var(--accent)' : isToday ? '1.5px solid var(--border-2)' : '1px solid transparent',
                borderRadius: 10, cursor: 'pointer', background: 'transparent', minHeight: 40,
              }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--accent)' : 'var(--foreground)' }}>
                  {Number(d.slice(8, 10))}
                </span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: walked ? 'var(--spirit)' : 'transparent' }} />
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14, fontSize: 11, color: 'var(--muted)', alignItems: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--spirit)' }} /> Horizon Walk
      </div>
    </>
  )
}

function PeriodNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="pcard rise rise-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 16 }}>
      <button onClick={onPrev} aria-label="Previous" className="press" style={navBtn}><ChevronLeft size={18} color="var(--foreground-2)" /></button>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
      <button onClick={onNext} aria-label="Next" className="press" style={navBtn}><ChevronRight size={18} color="var(--foreground-2)" /></button>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', cursor: 'pointer',
}
