'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Minus, Plus } from 'lucide-react'
import { habitIcon } from '@/lib/habitIcon'

// A day's numbers, logged in one gesture.
//
// Binary habits are a single tap. Counted ones (protein, hydration, study
// minutes) step up and down — and the value itself is tappable, because logging
// 187g of protein should not be ten taps. Measures like body weight are
// direct-entry only; incrementing them makes no sense.

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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const Icon = habitIcon(habit.icon)
  const c = habit.color

  const isBinary = habit.kind === 'binary'
  const isMeasure = habit.kind === 'measure'

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function save(v: number, d: boolean) {
    setValue(v); setDone(d)
    fetch('/api/habits/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habit.id, value: v, done: d }),
    }).then(() => start(() => router.refresh()))
  }

  // A measure is "done" once it has any reading at all; a count has to reach its target.
  const isDone = (v: number) => (isMeasure ? v > 0 : v >= habit.target)

  function bump(dir: 1 | -1) {
    const nv = Math.max(0, Math.min(habit.target, value + dir * habit.step))
    save(nv, isDone(nv))
  }

  function commitDraft() {
    setEditing(false)
    const n = Number(draft)
    if (!draft.trim() || Number.isNaN(n) || n < 0) return
    // Measures aren't capped by the target — the target is a goal, not a ceiling.
    const nv = isMeasure ? n : Math.min(habit.target, n)
    save(nv, isDone(nv))
  }

  const pct = isBinary ? (done ? 100 : 0) : Math.min(100, (value / (habit.target || 1)) * 100)

  return (
    <div className={`pcard rise rise-${Math.min(6, (index % 6) + 1)}`} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px' }}>
      <span className="grad-icon" style={{ width: 40, height: 40, background: `${c}1c`, borderRadius: 12, flexShrink: 0 }}>
        <Icon size={19} color={c} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{habit.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {habit.week.map((d, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: d ? c : 'var(--surface-3)' }} />
            ))}
          </div>

          {!isBinary && (editing ? (
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="any"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={e => { if (e.key === 'Enter') commitDraft(); if (e.key === 'Escape') setEditing(false) }}
              aria-label={`${habit.name} value`}
              style={{
                width: 82, minHeight: 32, marginLeft: 2, padding: '2px 8px', borderRadius: 8,
                background: 'var(--surface-2)', border: `1px solid ${c}`, color: 'var(--foreground)',
                fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              }}
            />
          ) : (
            <button
              onClick={() => { setDraft(String(value)); setEditing(true) }}
              className="press"
              aria-label={`Set ${habit.name} value`}
              style={{
                marginLeft: 2, minHeight: 32, padding: '0 10px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: done ? c : 'var(--foreground-2)', fontSize: 12, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}{isMeasure ? '' : ` / ${habit.target}`}{habit.unit}
            </button>
          ))}
        </div>
      </div>

      {isBinary ? (
        <button
          onClick={() => save(done ? 0 : 1, !done)}
          className="press"
          aria-label={done ? `Undo ${habit.name}` : `Mark ${habit.name} done`}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
            border: done ? 'none' : '1.5px solid var(--border-2)',
            background: done ? c : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {done && <Check size={18} color="#0a0b0f" strokeWidth={3} />}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!isMeasure && (
            <>
              <button onClick={() => bump(-1)} className="press" aria-label={`Decrease ${habit.name}`} style={stepBtn}>
                <Minus size={15} color="var(--foreground-2)" />
              </button>
              <button
                onClick={() => bump(1)}
                className="press"
                aria-label={`Increase ${habit.name}`}
                style={{
                  ...stepBtn,
                  background: done ? c : `conic-gradient(${c} ${pct}%, var(--surface-2) 0)`,
                  border: 'none',
                }}
              >
                {done ? <Check size={16} color="#0a0b0f" strokeWidth={3} /> : <Plus size={15} color="var(--foreground)" />}
              </button>
            </>
          )}
          {isMeasure && (
            <button
              onClick={() => { setDraft(String(value)); setEditing(true) }}
              className="press"
              aria-label={`Log ${habit.name}`}
              style={{ ...stepBtn, background: value > 0 ? c : 'var(--surface-2)', border: 'none' }}
            >
              {value > 0 ? <Check size={16} color="#0a0b0f" strokeWidth={3} /> : <Plus size={15} color="var(--foreground)" />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const stepBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--surface-2)', border: '1px solid var(--border)',
}
