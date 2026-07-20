'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus } from 'lucide-react'
import { habitIcon } from '@/lib/habitIcon'

type Habit = {
  id: string; name: string; icon?: string; kind: string; target: number
  unit?: string; step: number; color: string; week: boolean[]
}

export default function HabitRow({ habit, initValue, initDone, index }: {
  habit: Habit; initValue: number; initDone: boolean; index: number
}) {
  const router = useRouter()
  const [value, setValue] = useState(initValue)
  const [done, setDone] = useState(initDone)
  const [, start] = useTransition()
  const Icon = habitIcon(habit.icon)
  const c = habit.color

  function save(v: number, d: boolean) {
    setValue(v); setDone(d)
    fetch('/api/habits/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habit.id, value: v, done: d }),
    }).then(() => start(() => router.refresh()))
  }

  function onTap() {
    if (habit.kind === 'binary') { save(done ? 0 : 1, !done); return }
    const nv = Math.min(habit.target, value + habit.step)
    save(nv, nv >= habit.target)
  }

  const pct = habit.kind === 'binary' ? (done ? 100 : 0) : Math.min(100, (value / habit.target) * 100)

  return (
    <div className={`pcard rise rise-${Math.min(6, (index % 6) + 1)}`} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px' }}>
      <span className="grad-icon" style={{ width: 40, height: 40, background: `${c}1c`, borderRadius: 12, flexShrink: 0 }}><Icon size={19} color={c} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--foreground)' }}>{habit.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {/* week dots */}
          <div style={{ display: 'flex', gap: 4 }}>
            {habit.week.map((d, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: d ? c : 'var(--surface-3)' }} />
            ))}
          </div>
          {habit.kind !== 'binary' && (
            <span style={{ fontSize: 11, color: done ? c : 'var(--muted)', fontWeight: 600, marginLeft: 4 }}>{value} / {habit.target}{habit.unit}</span>
          )}
        </div>
      </div>
      <button onClick={onTap} className="press" aria-label={`log ${habit.name}`} style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        border: done ? 'none' : `1.5px solid var(--border-2)`,
        background: done ? c : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...(habit.kind !== 'binary' && !done ? { background: `conic-gradient(${c} ${pct}%, var(--surface-3) 0)` } : {}),
      }}>
        {done ? <Check size={16} color="#0a0b0f" /> : habit.kind !== 'binary' ? <Plus size={14} color="var(--foreground-2)" /> : null}
      </button>
    </div>
  )
}
