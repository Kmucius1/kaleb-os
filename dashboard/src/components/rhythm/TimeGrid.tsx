'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GripHorizontal, Lock, Sunrise, Sunset } from 'lucide-react'
import { fmtMin } from '@/lib/rhythm/engine'
import { pillarColor } from '@/lib/rhythm/pillars'
import type { PlannedBlock } from '@/lib/rhythm/types'
import type { ResolvedDay } from '@/lib/rhythm/day'

// The day as actual time, not a list. Drag a block to move it, drag its bottom
// edge to resize. Pointer events throughout so it behaves the same under a
// thumb and a mouse, and touch-action:none stops the page fighting the drag.
//
// Protected blocks don't move — the server refuses too, so a stray drag can
// never quietly relocate trading or the DRYP block.

const PX_PER_MIN = 1.15
const SNAP = 5
const GUTTER = 54

type Drag =
  | { mode: 'move'; key: string; startY: number; origStart: number; origEnd: number }
  | { mode: 'resize'; key: string; startY: number; origStart: number; origEnd: number }

export default function TimeGrid({ day, nowMin, isToday, onChanged }: {
  day: ResolvedDay
  nowMin: number
  isToday: boolean
  onChanged: () => void
}) {
  const blocks = day.blocks.filter(b => b.status !== 'skipped')
  const from = Math.max(0, Math.min(...blocks.map(b => b.start), 6 * 60) - 30)
  const to = Math.min(1440, Math.max(...blocks.map(b => b.end), 22 * 60) + 30)

  const [drag, setDrag] = useState<Drag | null>(null)
  const [ghost, setGhost] = useState<{ key: string; start: number; end: number } | null>(null)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const surface = useRef<HTMLDivElement>(null)

  const y = useCallback((min: number) => (min - from) * PX_PER_MIN, [from])

  // Auto-clear the toast, but keep it long enough to actually reach undo.
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(id)
  }, [toast])

  const commit = useCallback(async (key: string, start: number, end: number, prev: { start: number; end: number }) => {
    try {
      const res = await fetch('/api/rhythm/move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, start, end, date: day.dateStr }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setToast({ text: body.message ?? 'Could not move that block.' })
        onChanged()
        return
      }
      const conflicted = (body.conflicts ?? []).length > 0
      setToast({
        text: conflicted
          ? `Moved to ${fmtMin(start)} — that now overlaps something.`
          : `Moved to ${fmtMin(start)}–${fmtMin(end)}.`,
        undo: async () => {
          await fetch('/api/rhythm/move', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, start: prev.start, end: prev.end, date: day.dateStr, revert: true }),
          })
          setToast(null)
          onChanged()
        },
      })
      onChanged()
    } catch {
      setToast({ text: 'Could not save that change.' })
      onChanged()
    }
  }, [day.dateStr, onChanged])

  function onPointerDown(e: React.PointerEvent, b: PlannedBlock, mode: 'move' | 'resize') {
    if (b.flexibility === 'protected' || b.locked) {
      setToast({ text: `${b.title} is ${b.locked ? 'locked' : 'protected'} — unlock it to move it.` })
      return
    }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setDrag({ mode, key: b.key, startY: e.clientY, origStart: b.start, origEnd: b.end })
    setGhost({ key: b.key, start: b.start, end: b.end })
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return
    e.preventDefault()
    const deltaMin = Math.round((e.clientY - drag.startY) / PX_PER_MIN / SNAP) * SNAP
    if (drag.mode === 'move') {
      const dur = drag.origEnd - drag.origStart
      const start = clamp(drag.origStart + deltaMin, from, to - dur)
      setGhost({ key: drag.key, start, end: start + dur })
    } else {
      const end = clamp(drag.origEnd + deltaMin, drag.origStart + SNAP, to)
      setGhost({ key: drag.key, start: drag.origStart, end })
    }
  }

  function onPointerUp() {
    if (!drag || !ghost) { setDrag(null); setGhost(null); return }
    const moved = ghost.start !== drag.origStart || ghost.end !== drag.origEnd
    if (moved) void commit(drag.key, ghost.start, ghost.end, { start: drag.origStart, end: drag.origEnd })
    setDrag(null)
    setGhost(null)
  }

  const hours: number[] = []
  for (let h = Math.floor(from / 60); h <= Math.ceil(to / 60); h++) hours.push(h)

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={surface}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative',
          height: (to - from) * PX_PER_MIN,
          touchAction: drag ? 'none' : 'auto',
          userSelect: drag ? 'none' : 'auto',
        }}
      >
        {/* Hour rules */}
        {hours.map(h => (
          <div key={h} style={{ position: 'absolute', top: y(h * 60), left: 0, right: 0, height: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="tabular" style={{ width: GUTTER - 10, textAlign: 'right', fontSize: 10, color: 'var(--muted)', transform: 'translateY(-6px)' }}>
              {fmtMin((h % 24) * 60)}
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        ))}

        {/* Sun markers */}
        {[
          { label: 'Sunrise', at: day.sun.sunriseMin, Icon: Sunrise },
          { label: 'Sunset', at: day.sun.sunsetMin, Icon: Sunset },
        ].filter(s => s.at >= from && s.at <= to).map(({ label, at, Icon }) => (
          <div key={label} style={{ position: 'absolute', top: y(at), left: GUTTER, right: 0, display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
            <Icon size={11} color="var(--money)" />
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--money)' }}>{label}</span>
            <span style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg, color-mix(in srgb, var(--money) 40%, transparent) 0 4px, transparent 4px 8px)' }} />
          </div>
        ))}

        {/* Now line */}
        {isToday && nowMin >= from && nowMin <= to && (
          <div style={{ position: 'absolute', top: y(nowMin), left: GUTTER - 6, right: 0, display: 'flex', alignItems: 'center', zIndex: 5, pointerEvents: 'none' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, height: 1.5, background: 'var(--accent)' }} />
          </div>
        )}

        {/* Blocks */}
        {blocks.map(b => {
          const g = ghost?.key === b.key ? ghost : null
          const start = g?.start ?? b.start
          const end = g?.end ?? b.end
          const color = pillarColor(b.pillar)
          const h = Math.max(22, (end - start) * PX_PER_MIN)
          const locked = b.flexibility === 'protected' || b.locked
          const dragging = drag?.key === b.key
          const short = h < 46

          return (
            <div
              key={b.key}
              onPointerDown={e => onPointerDown(e, b, 'move')}
              style={{
                position: 'absolute', top: y(start), left: GUTTER, right: 2, height: h,
                borderRadius: 12, padding: short ? '3px 9px' : '7px 10px',
                background: dragging
                  ? `color-mix(in srgb, ${color} 26%, var(--surface))`
                  : `color-mix(in srgb, ${color} 12%, var(--surface))`,
                border: `1px solid ${dragging ? color : `color-mix(in srgb, ${color} 42%, transparent)`}`,
                borderLeft: `3px solid ${color}`,
                boxShadow: dragging ? `0 10px 30px -8px color-mix(in srgb, ${color} 70%, transparent)` : 'none',
                cursor: locked ? 'default' : 'grab',
                touchAction: 'none',
                opacity: b.status === 'done' ? 0.6 : 1,
                overflow: 'hidden', zIndex: dragging ? 20 : 1,
                transition: dragging ? 'none' : 'top .18s var(--ease), height .18s var(--ease)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: short ? 11 : 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.title}
                </span>
                {locked && <Lock size={9} color="var(--muted)" style={{ flexShrink: 0 }} />}
              </div>
              {!short && (
                <div className="tabular" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>
                  {fmtMin(start)} – {fmtMin(end)}
                </div>
              )}

              {!locked && h >= 34 && (
                <div
                  onPointerDown={e => { e.stopPropagation(); onPointerDown(e, b, 'resize') }}
                  aria-label={`Resize ${b.title}`}
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'ns-resize', touchAction: 'none',
                  }}
                >
                  <GripHorizontal size={13} color={`color-mix(in srgb, ${color} 70%, transparent)`} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Live readout while dragging — you can see the time without lifting your thumb */}
      {drag && ghost && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 96, zIndex: 300,
          background: 'var(--surface-3)', border: '1px solid var(--border-2)', borderRadius: 12,
          padding: '9px 16px', fontSize: 13.5, fontWeight: 700, pointerEvents: 'none',
        }} className="tabular">
          {fmtMin(ghost.start)} – {fmtMin(ghost.end)}
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}> · {ghost.end - ghost.start}m</span>
        </div>
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', left: 16, right: 16, bottom: 96, zIndex: 300, maxWidth: 488, margin: '0 auto',
          background: 'var(--surface-3)', border: '1px solid var(--border-2)', borderRadius: 14,
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 12px 40px -12px rgba(0,0,0,0.7)',
        }}>
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{toast.text}</span>
          {toast.undo && (
            <button onClick={toast.undo} className="press" style={{
              minHeight: 44, padding: '0 16px', borderRadius: 11, cursor: 'pointer', flexShrink: 0,
              background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
            }}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
