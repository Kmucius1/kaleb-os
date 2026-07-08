import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FACTORS } from '@/lib/commerce-rubric'
import CommerceDecision from '@/components/CommerceDecision'
import { ChevronLeft, ExternalLink, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const money = (n: number | null | undefined) => (n == null ? '—' : '$' + Number(n).toFixed(2).replace(/\.00$/, ''))
const scoreColor = (s: number) => (s >= 8 ? 'var(--green)' : s >= 5 ? 'var(--yellow)' : 'var(--red)')

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: p } = await supabase.from('commerce_products').select('*').eq('id', id).single()
  if (!p) notFound()

  const scores = (p.scores ?? {}) as Record<string, { score: number; note: string }>
  const markup = p.supplier_cost && p.suggested_price ? (p.suggested_price / p.supplier_cost).toFixed(1) + 'x' : '—'
  const isWinnerQueued = p.verdict === 'winner' && p.status === 'queued'

  return (
    <div className="page-pad" style={{ maxWidth: 900, margin: '0 auto' }}>
      <Link href="/commerce" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--foreground-2)', marginBottom: 14 }}>
        <ChevronLeft size={15} /> Product Scout
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{p.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {p.category || '—'} · {p.source === 'manual' ? 'you added' : 'scout found'}
            {p.source_url && (
              <> · <a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--foreground-2)', display: 'inline-flex', gap: 3, alignItems: 'center' }}><ExternalLink size={12} /> reference</a></>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: p.disqualified ? 'var(--red)' : scoreColor(Number(p.score_total ?? 0) / 10) }}>
            {p.disqualified ? 'DQ' : p.success_probability}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em' }}>SUCCESS SCORE / 100</div>
        </div>
      </div>

      {p.description && <p style={{ fontSize: 14, color: 'var(--foreground-2)', lineHeight: 1.55, margin: '10px 0 0' }}>{p.description}</p>}

      {/* Disqualifier banner */}
      {p.disqualified && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 12, padding: 14, marginTop: 16 }}>
          <AlertTriangle size={17} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13.5 }}>Auto-disqualified</div>
            <div style={{ fontSize: 13, color: 'var(--foreground-2)', marginTop: 3 }}>{p.disqualify_reason}</div>
          </div>
        </div>
      )}

      {/* Economics */}
      <div className="stat-grid" style={{ margin: '18px 0 6px' }}>
        <Mini label="SUPPLIER COST" value={money(p.supplier_cost)} />
        <Mini label="RETAIL" value={money(p.suggested_price)} />
        <Mini label="MARKUP" value={markup} />
        <Mini label="EST. NET MARGIN" value={p.est_margin != null ? Math.round(Number(p.est_margin) * 100) + '%' : '—'} />
      </div>

      {p.reasoning && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 15, marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 6 }}>VERDICT</div>
          <div style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.55 }}>{p.reasoning}</div>
        </div>
      )}

      {/* Factor breakdown */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--foreground-2)', margin: '24px 0 12px' }}>
        SCORING BREAKDOWN · {p.score_total}/100 weighted
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {FACTORS.map(f => {
          const s = scores[f.id]?.score ?? 0
          const note = scores[f.id]?.note
          return (
            <div key={f.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {f.label}
                    {f.gate && <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 5, padding: '1px 5px', marginLeft: 7, verticalAlign: 1 }}>GATE</span>}
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 7 }}>{f.weight}%</span>
                  </div>
                </div>
                <div style={{ width: 96, height: 6, background: 'var(--border-2)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: `${s * 10}%`, height: '100%', background: scoreColor(s) }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(s), width: 34, textAlign: 'right', flexShrink: 0 }}>{s}<span style={{ fontSize: 10, color: 'var(--muted)' }}>/10</span></div>
              </div>
              {note && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>{note}</div>}
            </div>
          )
        })}
      </div>

      {/* Decision */}
      {isWinnerQueued && (
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--foreground-2)', marginBottom: 12 }}>YOUR CALL</div>
          <CommerceDecision id={p.id} />
        </div>
      )}
      {!isWinnerQueued && p.decided_at && (
        <div style={{ marginTop: 20, fontSize: 13, color: 'var(--foreground-2)' }}>
          Status: <b style={{ color: 'var(--foreground)', textTransform: 'capitalize' }}>{p.status}</b>
        </div>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 3 }}>{label}</div>
    </div>
  )
}
