import { PILLARS, PILLAR_META } from '@/lib/rhythm/pillars'

// Alignment is never a single number pretending to be the truth. We show the
// overall figure, the six pillars underneath it, and how confident the score is
// given how much of the day has actually been logged.

export type Alignment = {
  overall: number
  byPillar: Record<string, { done: number; of: number }>
  confidence: 'low' | 'medium' | 'high'
  loggedShare: number
}

export default function AlignmentBar({ alignment }: { alignment: Alignment }) {
  const conf = alignment.confidence
  return (
    <section className="pcard rise rise-6" style={{ marginBottom: 20 }} aria-label="Alignment">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="label">Alignment</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {conf === 'low' ? 'low confidence — little logged yet' : conf === 'medium' ? 'partial day logged' : 'most of the day logged'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{alignment.overall}%</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', paddingBottom: 4 }}>of today’s blocks lived</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {PILLARS.map(p => {
          const v = alignment.byPillar[p] ?? { done: 0, of: 0 }
          const pct = v.of === 0 ? 0 : Math.round((v.done / v.of) * 100)
          const color = PILLAR_META[p].color
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 88, fontSize: 11.5, color: 'var(--foreground-2)', flexShrink: 0 }}>{p}</span>
              <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width .4s var(--ease)' }} />
              </span>
              <span className="tabular" style={{ width: 42, textAlign: 'right', fontSize: 11, color: v.of === 0 ? 'var(--muted-2)' : 'var(--muted)', flexShrink: 0 }}>
                {v.of === 0 ? '—' : `${v.done}/${v.of}`}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
