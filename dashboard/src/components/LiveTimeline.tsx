'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, ChevronRight } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { blockIcon } from '@/lib/blockIcon'
import { etNowMinutes, fmtClock, PILLAR_COLORS } from '@/lib/clock'

export type LiveBlock = {
  id: string
  start_min: number
  end_min: number
  title: string
  pillar: string
  detail: string | null
  theme?: string | null
}

// The home "Current Block" + "Up Next" cards, made live. The server hands us
// today's blocks; we recompute which one is active every second off the ET
// clock, so the countdown ticks down and rolls into the next block on its own —
// no app restart needed. We also re-pull the blocks every 60s (and whenever the
// app comes back to the foreground) to catch schedule edits and the midnight
// day-type rollover.
export default function LiveTimeline({ initialBlocks }: { initialBlocks: LiveBlock[] }) {
  const [blocks, setBlocks] = useState<LiveBlock[]>(initialBlocks)
  const [nowMin, setNowMin] = useState<number>(() => etNowMinutes())

  // Tick the clock every second.
  useEffect(() => {
    const id = setInterval(() => setNowMin(etNowMinutes()), 1000)
    return () => clearInterval(id)
  }, [])

  // Keep today's blocks fresh (edits, new day) without reopening the app.
  useEffect(() => {
    let alive = true
    async function refresh() {
      try {
        const res = await fetch('/api/schedule/today', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (alive && Array.isArray(data.blocks)) setBlocks(data.blocks)
      } catch { /* keep last-known blocks */ }
    }
    const id = setInterval(refresh, 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') { setNowMin(etNowMinutes()); refresh() } }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const cur = blocks.find(b => nowMin >= b.start_min && nowMin < b.end_min) ?? null
  const nxt = blocks.find(b => b.start_min > nowMin) ?? null

  const curColor = cur ? (PILLAR_COLORS[cur.pillar] ?? 'var(--accent)') : 'var(--accent)'
  const remainMin = cur ? cur.end_min - nowMin : 0
  const elapsedPct = cur ? ((nowMin - cur.start_min) / (cur.end_min - cur.start_min)) * 100 : 0
  const remainLabel = remainMin >= 60 ? `${Math.floor(remainMin / 60)}h ${remainMin % 60}m` : `${remainMin}m`
  const CurIcon = cur ? blockIcon(cur.title) : Target
  const NxtIcon = nxt ? blockIcon(nxt.title) : Target
  const nxtColor = nxt ? (PILLAR_COLORS[nxt.pillar] ?? 'var(--muted)') : 'var(--muted)'

  return (
    <>
      {/* Current block — the operating timeline centerpiece */}
      {cur ? (
        <div className="pcard glow rise rise-2" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label" style={{ marginBottom: 10 }}>Current Block</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className="grad-icon breathe" style={{ width: 34, height: 34, background: `${curColor}22`, borderRadius: 11 }}><CurIcon size={18} color={curColor} /></span>
              <span className="h-title" style={{ color: 'var(--foreground)' }}>{cur.title}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtClock(cur.start_min)} – {fmtClock(cur.end_min)}</div>
            {cur.detail && <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', marginTop: 6, lineHeight: 1.4 }}>{cur.detail}</div>}
          </div>
          <ProgressRing pct={elapsedPct} color={curColor} size={104}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>{remainLabel}</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.08em' }}>REMAINING</div>
          </ProgressRing>
        </div>
      ) : (
        <div className="pcard rise rise-2" style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>Open Window</div>
          <div style={{ fontSize: 15, color: 'var(--foreground-2)' }}>Between blocks — breathe, or get ahead.</div>
        </div>
      )}

      {/* Up next */}
      {nxt && (
        <Link href="/schedule" className="pcard press rise rise-3" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="grad-icon" style={{ width: 38, height: 38, background: `${nxtColor}1c`, borderRadius: 12 }}><NxtIcon size={19} color={nxtColor} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label" style={{ marginBottom: 4 }}>Up Next</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{nxt.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{fmtClock(nxt.start_min)} – {fmtClock(nxt.end_min)}</div>
          </div>
          <ChevronRight size={18} color="var(--muted)" />
        </Link>
      )}
    </>
  )
}
