import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FACTORS } from '@/lib/commerce-rubric'
import CommerceDecision from '@/components/CommerceDecision'
import AddProduct from '@/components/AddProduct'
import RunScoutButton from '@/components/RunScoutButton'
import { ShoppingBag, ExternalLink, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Product = {
  id: string; name: string; description: string | null; category: string | null
  source: string; source_url: string | null
  supplier_cost: number | null; suggested_price: number | null; est_margin: number | null
  scores: Record<string, { score: number; note: string }> | null
  score_total: number | null; success_probability: number | null
  verdict: string | null; reasoning: string | null
  disqualified: boolean; disqualify_reason: string | null; status: string; created_at: string
  build_status: string | null
}
type ScoutRun = {
  id: string; ran_at: string; trigger: string; candidates_scored: number | null
  winners: number | null; summary: string | null; status: string
}

const money = (n: number | null | undefined) => (n == null ? '—' : '$' + Number(n).toFixed(2).replace(/\.00$/, ''))
const factorLabel = (id: string) => FACTORS.find(f => f.id === id)?.label ?? id
const probColor = (p: number) => (p >= 72 ? 'var(--green)' : p >= 55 ? 'var(--yellow)' : 'var(--muted)')
const BUILD_STATUS_COLOR: Record<string, string> = {
  pending: 'var(--yellow)', building: 'var(--accent)', ready: 'var(--cyan)', live: 'var(--green)', failed: 'var(--red)',
}

export default async function CommercePage() {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const [{ data: queued }, { data: recent }, { data: runs }, { count: weekCount }] = await Promise.all([
    supabase.from('commerce_products').select('*').eq('status', 'queued').eq('verdict', 'winner').order('score_total', { ascending: false }),
    supabase.from('commerce_products').select('*').order('created_at', { ascending: false }).limit(40),
    supabase.from('commerce_scout_runs').select('*').order('ran_at', { ascending: false }).limit(8),
    supabase.from('commerce_products').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
  ])

  const winners = (queued ?? []) as Product[]
  const all = (recent ?? []) as Product[]
  const scoutRuns = (runs ?? []) as ScoutRun[]
  const avgProb = all.length
    ? Math.round(all.reduce((s, p) => s + Number(p.success_probability ?? 0), 0) / all.length)
    : 0
  const lastRun = scoutRuns[0]

  return (
    <div className="page-pad" style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <ShoppingBag size={18} color="var(--accent)" />
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Product Scout</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Autonomous dropshipping · approve-gated</span>
        <div style={{ marginLeft: 'auto' }}><RunScoutButton /></div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ margin: '0 0 26px' }}>
        <StatCard label="TO REVIEW" value={String(winners.length || '—')} accent="var(--green)" sub="winners queued" />
        <StatCard label="SCORED / WK" value={String(weekCount || 0)} accent="var(--accent)" sub="products evaluated" />
        <StatCard label="AVG SCORE" value={all.length ? String(avgProb) : '—'} accent="var(--cyan)" sub="of last 40" />
        <StatCard label="LAST SCOUT" value={lastRun ? timeago(lastRun.ran_at) : '—'} accent="var(--purple)" sub={lastRun ? `${lastRun.winners ?? 0} winners` : 'not run yet'} />
      </div>

      {/* DECISION QUEUE */}
      <SectionTitle>DECISION QUEUE · {winners.length} awaiting your call</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 26 }}>
        {winners.map(p => <WinnerCard key={p.id} p={p} />)}
        {winners.length === 0 && (
          <div className="list-card" style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5 }}>
            No winners queued right now. Run the scout, or feed it an idea below — only products scoring{' '}
            <span style={{ color: 'var(--green)' }}>72+</span> reach this queue.
          </div>
        )}
      </div>

      {/* ADD A PRODUCT */}
      <div style={{ marginBottom: 26 }}><AddProduct /></div>

      {/* SCORED BOARD */}
      <SectionTitle>SCORED BOARD · last {all.length}</SectionTitle>
      <div className="card-list" style={{ marginBottom: 26 }}>
        {all.map(p => (
          <Link key={p.id} href={`/commerce/${p.id}`} className="list-card row-hover" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.category || '—'} · {money(p.suggested_price)}</div>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: p.disqualified ? 'var(--red)' : probColor(Number(p.success_probability ?? 0)) }}>
                  {p.disqualified ? 'DQ' : p.success_probability ?? '—'}
                </div>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <VerdictChip verdict={p.verdict} status={p.status} disqualified={p.disqualified} />
                  {(p.status === 'approved' || p.status === 'launched') && <BuildStatusChip status={p.build_status} />}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {all.length === 0 && <div className="list-card" style={{ color: 'var(--muted)' }}>Nothing scored yet.</div>}
      </div>

      {/* SCOUT LOG */}
      <SectionTitle>SCOUT LOG</SectionTitle>
      <div className="card-list">
        {scoutRuns.map(r => (
          <div key={r.id} className="list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: r.status === 'error' ? 'var(--red)' : 'var(--foreground)' }}>
                {r.trigger === 'cron' ? 'Daily scout' : 'Manual run'}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{timeago(r.ran_at)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', marginTop: 6 }}>{r.summary || `Scored ${r.candidates_scored ?? 0}`}</div>
          </div>
        ))}
        {scoutRuns.length === 0 && <div className="list-card" style={{ color: 'var(--muted)' }}>No scout runs yet.</div>}
      </div>
    </div>
  )
}

// ── Winner card (the approval unit) ───────────────────────────────────────────
function WinnerCard({ p }: { p: Product }) {
  const scores = p.scores ?? {}
  const top = Object.entries(scores).sort((a, b) => (b[1]?.score ?? 0) - (a[1]?.score ?? 0)).slice(0, 4)
  const markup = p.supplier_cost && p.suggested_price ? (p.suggested_price / p.supplier_cost).toFixed(1) + 'x' : '—'
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--green)', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <SuccessRing p={Number(p.success_probability ?? 0)} />
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16.5, fontWeight: 800 }}>{p.name}</span>
            {p.source_url && (
              <a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: 'var(--foreground-2)' }}>
                <ExternalLink size={12} /> ref
              </a>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            {p.category || '—'} · cost {money(p.supplier_cost)} → {money(p.suggested_price)} · {markup} markup
            {p.est_margin != null && ` · ~${Math.round(Number(p.est_margin) * 100)}% net`}
          </div>
          {p.reasoning && <div style={{ fontSize: 13, color: 'var(--foreground-2)', marginTop: 10, lineHeight: 1.5 }}>{p.reasoning}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {top.map(([id, s]) => (
              <span key={id} style={{ fontSize: 11, color: 'var(--foreground-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                {factorLabel(id).split(' / ')[0]} <b style={{ color: 'var(--foreground)' }}>{s?.score}</b>/10
              </span>
            ))}
            <Link href={`/commerce/${p.id}`} style={{ fontSize: 11.5, color: 'var(--accent)', alignSelf: 'center' }}>full breakdown →</Link>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <CommerceDecision id={p.id} />
      </div>
    </div>
  )
}

// ── Bits ──────────────────────────────────────────────────────────────────────
function SuccessRing({ p }: { p: number }) {
  const r = 30, C = 2 * Math.PI * r
  const color = probColor(p)
  return (
    <div style={{ position: 'relative', width: 74, height: 74, flexShrink: 0 }}>
      <svg width="74" height="74" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="37" cy="37" r={r} fill="none" stroke="var(--border-2)" strokeWidth="6" />
        <circle cx="37" cy="37" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * Math.max(0, Math.min(100, p))) / 100} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{p}</span>
        <span style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.05em' }}>SCORE</span>
      </div>
    </div>
  )
}

function VerdictChip({ verdict, status, disqualified }: { verdict: string | null; status: string; disqualified: boolean }) {
  if (disqualified) return <span style={chip('var(--red)')}><AlertTriangle size={10} style={{ marginRight: 3, verticalAlign: -1 }} />disqualified</span>
  const map: Record<string, string> = { winner: 'var(--green)', maybe: 'var(--yellow)', pass: 'var(--muted)' }
  const statusMap: Record<string, string> = { approved: 'var(--green)', rejected: 'var(--red)', held: 'var(--yellow)', queued: 'var(--green)' }
  const showStatus = ['approved', 'rejected', 'held'].includes(status)
  const label = showStatus ? status : verdict || 'scored'
  const color = showStatus ? statusMap[status] : (map[verdict || ''] ?? 'var(--muted)')
  return <span style={chip(color)}>{label}</span>
}
const chip = (c: string): React.CSSProperties => ({ fontSize: 10.5, fontWeight: 700, color: c, background: `${c}1f`, borderRadius: 6, padding: '2px 7px', textTransform: 'capitalize', display: 'inline-block', marginTop: 4 })

function BuildStatusChip({ status }: { status: string | null }) {
  const label = status || 'not started'
  const color = status ? (BUILD_STATUS_COLOR[status] ?? 'var(--muted)') : 'var(--muted)'
  return <span style={chip(color)}>build: {label}</span>
}

function StatCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 14, padding: '14px 15px' }}>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--foreground-2)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--foreground-2)', marginBottom: 10 }}>{children}</div>
}
function timeago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
