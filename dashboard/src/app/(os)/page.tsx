import Link from 'next/link'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { resolveDay } from '@/lib/rhythm/day'
import { scoreDay } from '@/lib/rhythm/alignment'
import { planHorizonWalk } from '@/lib/rhythm/sun'
import { SLEEP } from '@/lib/rhythm/template'
import { fmtMin } from '@/lib/rhythm/engine'
import { pillarColor } from '@/lib/rhythm/pillars'
import NowCard from '@/components/rhythm/NowCard'
import HorizonCard from '@/components/rhythm/HorizonCard'
import AlignmentBar from '@/components/rhythm/AlignmentBar'

export const dynamic = 'force-dynamic'

// Home answers four questions and nothing else:
//   1. What am I doing now?   2. What's next?
//   3. What matters most today?   4. Am I aligned?
//
// Business metrics deliberately do not live here — they're in /business.

export default async function HomePage() {
  const day = await resolveDay()
  const alignment = scoreDay(day.blocks, day.nowMin)

  const [{ data: tasks }, { data: cfg }] = await Promise.all([
    supabase.from('tasks').select('title').in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false }).limit(3),
    supabase.from('kalebos_config').select('key,value').in('key', ['north_star']),
  ])
  const focus = (cfg ?? []).find(c => c.key === 'north_star')?.value
    || 'Become the man capable of creating everything else.'

  const hour = Math.floor(day.nowMin / 60)
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
  }).format(new Date())

  const identity = day.current?.identity ?? day.current?.pillar ?? null

  // Recompute the walk placement for the card copy (cheap, already-fetched sun).
  const horizonPlan = planHorizonWalk({
    sun: day.sun,
    busy: day.blocks
      .filter(b => b.key !== 'horizon' && b.kind !== 'sleep')
      .map(b => ({ start: b.start, end: b.end, flexibility: b.locked ? 'protected' : b.flexibility, title: b.title })),
    sleepTargetMin: SLEEP.targetSleepMin,
    wakeMin: SLEEP.wakeMin,
  })

  const upcoming = day.blocks.filter(b => b.end > day.nowMin && b.kind !== 'sleep').slice(0, 5)

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 32px' }}>
      <header className="rise rise-1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="h-hero" style={{ margin: 0 }}>
            {greeting}, <span style={{ color: 'var(--accent)' }}>Kaleb</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 0' }}>
            {dateLabel}
            {identity && <span style={{ color: pillarColor(day.current?.pillar) }}> · {identity}</span>}
          </p>
        </div>
        <Link href="/more" className="press" aria-label="More" style={{ color: 'var(--foreground-2)', flexShrink: 0, padding: 4 }}>
          <LayoutGrid size={21} />
        </Link>
      </header>

      <p className="rise rise-1" style={{ fontSize: 14.5, color: 'var(--foreground-2)', lineHeight: 1.45, margin: '0 0 20px' }}>
        {focus}
      </p>

      <NowCard
        initialBlocks={day.blocks}
        initialNow={day.nowMin}
        horizon={{ window: horizonPlan.window, leaveAt: horizonPlan.leaveAt, done: day.horizon.doneToday }}
      />

      {(tasks ?? []).length > 0 && (
        <section className="rise rise-4" style={{ marginBottom: 20 }} aria-label="Top priorities">
          <div className="label" style={{ margin: '0 4px 10px' }}>Top 3 today</div>
          <div className="pcard" style={{ padding: '6px 8px' }}>
            {(tasks ?? []).map((t, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-3)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--foreground-2)',
                }}>{i + 1}</span>
                <span style={{ fontSize: 14 }}>{t.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <HorizonCard
        window={horizonPlan.window}
        start={horizonPlan.start}
        leaveAt={horizonPlan.leaveAt}
        why={horizonPlan.why}
        doneToday={day.horizon.doneToday}
        week={day.horizon.week}
        estimated={day.sun.estimated}
      />

      <section className="rise rise-6" style={{ marginBottom: 20 }} aria-label="Rest of today">
        <div className="label" style={{ margin: '0 4px 10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Rest of today</span>
          <Link href="/schedule" style={{ color: 'var(--accent)', letterSpacing: 0, textTransform: 'none', fontWeight: 600 }}>
            Full day <ChevronRight size={11} style={{ display: 'inline', verticalAlign: -1 }} />
          </Link>
        </div>
        <div className="pcard" style={{ padding: '6px 8px' }}>
          {upcoming.length === 0 && (
            <div style={{ padding: '14px 10px', fontSize: 13.5, color: 'var(--muted)' }}>
              The day is done. Wind down.
            </div>
          )}
          {upcoming.map((b, i) => (
            <div key={b.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px',
              borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: b.status === 'done' ? 0.55 : 1,
            }}>
              <span className="tabular" style={{ fontSize: 11.5, color: 'var(--muted)', width: 62, flexShrink: 0 }}>
                {fmtMin(b.start)}
              </span>
              <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: pillarColor(b.pillar), flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.title}
              </span>
              {b.flexibility === 'protected' && (
                <span className="pillar-tag" style={{ color: 'var(--muted)', background: 'var(--surface-2)' }}>held</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <AlignmentBar alignment={alignment} />
    </div>
  )
}
