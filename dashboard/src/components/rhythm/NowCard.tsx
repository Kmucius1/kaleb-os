'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, Lock, Sparkles, Sunrise, Sunset } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { blockIcon } from '@/lib/blockIcon'
import { pillarColor } from '@/lib/rhythm/pillars'
import { fmtMin } from '@/lib/rhythm/engine'
import type { PlannedBlock } from '@/lib/rhythm/types'

// The single most important surface in KalebOS: what am I doing right now,
// how long is left, and the three actions that matter (done / delay / rebalance).
//
// Ticks locally off the ET clock so the countdown is live without polling, and
// re-pulls the day every 60s to pick up edits and the midnight rollover.

type Props = {
  initialBlocks: PlannedBlock[]
  initialNow: number
  horizon: { window: 'sunrise' | 'sunset'; leaveAt: number; done: boolean } | null
}

const etNow = () => {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  return (Number(p.find(x => x.type === 'hour')?.value ?? 0) % 24) * 60 + Number(p.find(x => x.type === 'minute')?.value ?? 0)
}

export default function NowCard({ initialBlocks, initialNow, horizon }: Props) {
  const router = useRouter()
  const [blocks, setBlocks] = useState(initialBlocks)
  const [now, setNow] = useState(initialNow)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(etNow()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        const r = await fetch('/api/rhythm/today', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json()
        if (alive && Array.isArray(d.blocks)) setBlocks(d.blocks)
      } catch { /* keep last-known */ }
    }
    const id = setInterval(refresh, 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') { setNow(etNow()); refresh() } }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const cur = blocks.find(b => now >= b.start && now < b.end && b.status !== 'skipped') ?? null
  const next = blocks.find(b => b.start > now && b.status !== 'skipped') ?? null

  async function act(path: string, body: unknown, key: string) {
    setBusy(key)
    try {
      await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      router.refresh()
    } finally { setBusy(null) }
  }

  const color = cur ? pillarColor(cur.pillar) : 'var(--accent)'
  const remain = cur ? cur.end - now : 0
  const pct = cur ? ((now - cur.start) / (cur.end - cur.start)) * 100 : 0
  const remainLabel = remain >= 60 ? `${Math.floor(remain / 60)}h ${remain % 60}m` : `${remain}m`
  const Icon = cur ? blockIcon(cur.title) : Clock

  return (
    <>
      {cur ? (
        <section className="pcard glow rise rise-2" style={{ marginBottom: 12 }} aria-label="Current block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                Now
                {cur.locked && <Lock size={10} color="var(--muted)" />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="grad-icon breathe" style={{ width: 34, height: 34, background: `${color}22`, borderRadius: 11, flexShrink: 0 }}>
                  <Icon size={18} color={color} />
                </span>
                <span className="h-title">{cur.title}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {fmtMin(cur.start)} – {fmtMin(cur.end)}
                <span style={{ color, fontWeight: 600 }}> · {cur.pillar}</span>
                {cur.identity && <span style={{ color: 'var(--foreground-2)' }}> · {cur.identity}</span>}
              </div>
              {cur.detail && (
                <p style={{ fontSize: 12.5, color: 'var(--foreground-2)', margin: '8px 0 0', lineHeight: 1.45 }}>{cur.detail}</p>
              )}
            </div>
            <ProgressRing pct={pct} color={color} size={104}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{remainLabel}</div>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.08em' }}>LEFT</div>
            </ProgressRing>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <ActionButton
              label={cur.status === 'done' ? 'Done' : 'Complete'}
              icon={Check}
              tone={cur.status === 'done' ? 'done' : 'primary'}
              busy={busy === 'complete'}
              onClick={() => act('/api/rhythm/complete', { key: cur.key, done: cur.status !== 'done' }, 'complete')}
            />
            <ActionButton
              label="Delay 15m"
              icon={Clock}
              busy={busy === 'delay'}
              onClick={() => act('/api/rhythm/rebalance', { apply: true, disruption: { key: cur.key, newEnd: cur.end + 15 } }, 'delay')}
            />
            <ActionButton
              label="Rebalance"
              icon={Sparkles}
              busy={busy === 'rebalance'}
              onClick={() => router.push('/schedule?rebalance=1')}
            />
          </div>
        </section>
      ) : (
        <section className="pcard rise rise-2" style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>Open window</div>
          <div style={{ fontSize: 15, color: 'var(--foreground-2)' }}>
            Nothing scheduled right now. Breathe, or pull something forward.
          </div>
        </section>
      )}

      {next && <NextCard block={next} now={now} horizon={horizon} />}
    </>
  )
}

function NextCard({ block, now, horizon }: { block: PlannedBlock; now: number; horizon: Props['horizon'] }) {
  const color = pillarColor(block.pillar)
  const Icon = blockIcon(block.title)
  const mins = block.start - now
  const travel = block.travelMinutes ?? 0
  const leaveIn = mins - travel
  const isHorizon = block.key === 'horizon'
  const SunIcon = horizon?.window === 'sunrise' ? Sunrise : Sunset

  return (
    <section className="pcard rise rise-3" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }} aria-label="Up next">
      <span className="grad-icon" style={{ width: 38, height: 38, background: `${color}1c`, borderRadius: 12, flexShrink: 0 }}>
        {isHorizon ? <SunIcon size={19} color={color} /> : <Icon size={19} color={color} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="label" style={{ marginBottom: 4 }}>Next</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{block.title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
          {fmtMin(block.start)} · in {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}
        </div>
        {travel > 0 && (
          <div style={{ fontSize: 11.5, color: leaveIn <= 10 ? 'var(--yellow)' : 'var(--foreground-2)', marginTop: 4, fontWeight: 600 }}>
            {leaveIn <= 0 ? `Leave now — ${travel} min travel` : `Leave in ${leaveIn}m (${travel} min travel)`}
          </div>
        )}
      </div>
    </section>
  )
}

function ActionButton({ label, icon: Icon, onClick, busy, tone = 'default' }: {
  label: string; icon: React.ElementType; onClick: () => void; busy?: boolean; tone?: 'default' | 'primary' | 'done'
}) {
  const bg = tone === 'primary' ? 'var(--accent)' : tone === 'done' ? 'var(--green-dim)' : 'var(--surface-2)'
  const fg = tone === 'primary' ? '#fff' : tone === 'done' ? 'var(--green)' : 'var(--foreground-2)'
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="press"
      style={{
        flex: 1, minHeight: 44, borderRadius: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        background: bg, color: fg, opacity: busy ? 0.6 : 1,
        border: tone === 'default' ? '1px solid var(--border)' : 'none',
        fontSize: 12.5, fontWeight: 600,
      }}
    >
      <Icon size={15} />{label}
    </button>
  )
}
