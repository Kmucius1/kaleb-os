import { supabase } from '@/lib/supabase'
import { PILLAR_COLORS } from '@/lib/schedule'
import HabitRow from '@/components/HabitRow'
import ProgressRing from '@/components/ui/ProgressRing'
import { CircleCheckBig } from 'lucide-react'

export const dynamic = 'force-dynamic'

const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d)
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default async function HabitsPage() {
  const now = new Date()
  const etDow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getDay()
  const weekDates = Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getTime() - (etDow - i) * 86400000)))
  const today = dayKey(now)

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from('habits').select('*').eq('active', true).order('sort_order'),
    supabase.from('habit_logs').select('habit_id,log_date,value,done').gte('log_date', weekDates[0]),
  ])

  const byHabit = new Map<string, Record<string, { value: number; done: boolean }>>()
  for (const l of logs ?? []) {
    if (!byHabit.has(l.habit_id)) byHabit.set(l.habit_id, {})
    byHabit.get(l.habit_id)![l.log_date] = { value: Number(l.value), done: l.done }
  }

  const rows = (habits ?? []).map((h: any) => {
    const days = byHabit.get(h.id) ?? {}
    return {
      habit: {
        id: h.id, name: h.name, icon: h.icon, kind: h.kind, target: Number(h.target),
        unit: h.unit, step: Number(h.step), color: PILLAR_COLORS[h.pillar] ?? 'var(--accent)',
        week: weekDates.map(d => days[d]?.done ?? false),
      },
      initValue: days[today]?.value ?? 0,
      initDone: days[today]?.done ?? false,
    }
  })
  const doneToday = rows.filter(r => r.initDone).length
  const total = rows.length
  const pct = total ? Math.round((doneToday / total) * 100) : 0

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Habits</h1>
          <p style={{ color: 'var(--foreground-2)', fontSize: 13.5, margin: '6px 0 0' }}>{doneToday} of {total} done today</p>
        </div>
        <ProgressRing pct={pct} size={64} stroke={6} color="var(--green)">
          <div style={{ fontSize: 14, fontWeight: 800 }}>{pct}%</div>
        </ProgressRing>
      </div>

      {/* Week legend */}
      <div className="rise rise-1 card2" style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 14px', marginBottom: 16 }}>
        {DOW.map((d, i) => (
          <span key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: weekDates[i] === today ? 'var(--accent)' : 'var(--muted)' }}>{d}</span>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="pcard" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 28 }}>
          <CircleCheckBig size={22} color="var(--muted)" style={{ marginBottom: 8 }} /><div>No habits yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => <HabitRow key={r.habit.id} habit={r.habit} initValue={r.initValue} initDone={r.initDone} index={i} />)}
        </div>
      )}
    </div>
  )
}
