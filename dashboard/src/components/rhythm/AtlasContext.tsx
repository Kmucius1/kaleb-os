'use client'
import { useEffect, useState } from 'react'
import { Waves } from 'lucide-react'
import { fmtMin } from '@/lib/rhythm/engine'
import { pillarColor } from '@/lib/rhythm/pillars'
import type { PlannedBlock } from '@/lib/rhythm/types'

// Atlas is not a blank chatbot — it opens already knowing where Kaleb is in his
// day. This strip is that knowledge, made visible.

type Today = {
  nowMin: number
  blocks: PlannedBlock[]
  sun: { sunriseMin: number; sunsetMin: number; estimated: boolean }
  horizon: { doneToday: boolean; week: { done: number; minimum: number } }
}

export default function AtlasContext() {
  const [d, setD] = useState<Today | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/rhythm/today', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (alive && j && !j.error) setD(j) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!d) return null

  const cur = d.blocks.find(b => d.nowMin >= b.start && d.nowMin < b.end && b.status !== 'skipped')
  const next = d.blocks.find(b => b.start > d.nowMin && b.status !== 'skipped')
  const color = cur ? pillarColor(cur.pillar) : 'var(--muted)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
      borderBottom: '1px solid var(--border)', background: 'var(--surface)',
      fontSize: 11.5, color: 'var(--muted)', overflowX: 'auto', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: 'var(--foreground-2)' }}>
        {cur ? <><strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{cur.title}</strong> until {fmtMin(cur.end)}</> : 'Open window'}
      </span>
      {next && <span>· next {next.title} {fmtMin(next.start)}</span>}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        · <Waves size={11} color={d.horizon.doneToday ? 'var(--green)' : 'var(--muted)'} />
        {d.horizon.week.done}/7
      </span>
      <span>· sunset {fmtMin(d.sun.sunsetMin)}</span>
    </div>
  )
}
