import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import Sparkline from '@/components/ui/Sparkline'
import { BarChart2, Sparkles } from 'lucide-react'

export const revalidate = 120

type Trade = {
  id: string
  symbol: string
  direction: 'long' | 'short'
  entry_price: number | null
  exit_price: number | null
  pnl: number | null
  trade_date: string | null
  notes: string | null
  created_at: string
}

type Insight = {
  id: string
  insight_type: string | null
  description: string
  created_at: string
}

export default async function TradingPage() {
  const [{ data: trades }, { data: insights }] = await Promise.all([
    supabase.from('trading_raw').select('*').order('trade_date', { ascending: false }).limit(100),
    supabase.from('trading_insights').select('*').order('created_at', { ascending: false }).limit(5),
  ])

  const all: Trade[] = trades ?? []
  const allInsights: Insight[] = insights ?? []

  const totalPnl = all.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const winners = all.filter(t => (t.pnl ?? 0) > 0)
  const winRate = all.length > 0 ? Math.round((winners.length / all.length) * 100) : null
  const bestTrade = all.length > 0 ? all.reduce((b, t) => (t.pnl ?? -Infinity) > (b.pnl ?? -Infinity) ? t : b) : null

  const hasData = all.length > 0

  // Real cumulative-P&L equity curve, oldest → newest (trades come back newest-first).
  const equity: number[] = []
  {
    let run = 0
    for (const t of [...all].reverse()) { run += t.pnl ?? 0; equity.push(run) }
  }
  const curveColor = totalPnl >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
        <span className="grad-icon breathe" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 12, flexShrink: 0 }}>
          <BarChart2 size={20} color="var(--accent)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
            <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Trading</h1>
            <span className="pillar-tag" style={{ color: hasData ? 'var(--accent)' : 'var(--muted)', background: hasData ? 'var(--accent-dim)' : 'var(--surface-2)' }}>Phase 7</span>
          </div>
          {hasData && <p style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '4px 0 0' }}>{all.length} trades tracked</p>}
        </div>
      </div>

      {!hasData && (
        <div className="pcard rise rise-2" style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 8 }}>Phase 7 — Not Yet Active</div>
          <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.6, marginBottom: 10 }}>
            Phase 7 activates trading discipline tracking. Connect TradePrint via n8n webhook to
            auto-capture trades. Atlas will track P&amp;L, identify patterns, and surface discipline insights.
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>
            Activate: build TradePrint → n8n → trading_raw webhook (Phase 3 remaining item)
          </div>
        </div>
      )}

      {/* Equity curve — real cumulative P&L */}
      {hasData && equity.length >= 2 && (
        <div className="pcard glow rise rise-2" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Cumulative P&amp;L</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: curveColor, lineHeight: 1 }}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </div>
              <div className="stat-sub" style={{ marginTop: 6 }}>across {all.length} trades</div>
            </div>
          </div>
          <div style={{ marginTop: 14, marginLeft: -2 }}>
            <Sparkline data={equity} color={curveColor} width={560} height={64} />
          </div>
        </div>
      )}

      {/* P&L stat tiles */}
      <div className="rise rise-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: hasData ? (totalPnl >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)' }}>
            {hasData ? `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}` : '—'}
          </div>
          <div className="stat-cap">Total P&amp;L</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--foreground)' }}>{hasData ? String(all.length) : '—'}</div>
          <div className="stat-cap">Trades</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: winRate != null ? (winRate >= 50 ? 'var(--green)' : 'var(--red)') : 'var(--muted)' }}>
            {winRate != null ? `${winRate}%` : '—'}
          </div>
          <div className="stat-cap">Win Rate</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: bestTrade?.pnl != null ? 'var(--green)' : 'var(--muted)' }}>
            {bestTrade?.pnl != null ? `+$${bestTrade.pnl.toFixed(2)}` : '—'}
          </div>
          <div className="stat-cap">Best Trade</div>
        </div>
      </div>

      {/* Insights */}
      {allInsights.length > 0 && (
        <div className="rise rise-4" style={{ marginBottom: 24 }}>
          <div className="label" style={{ margin: '0 4px 12px' }}>Atlas Insights · {allInsights.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allInsights.map(insight => (
              <div key={insight.id} className="pcard" style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                <span className="grad-icon" style={{ width: 34, height: 34, background: 'var(--accent-dim)', borderRadius: 11, flexShrink: 0 }}>
                  <Sparkles size={17} color="var(--accent)" />
                </span>
                <div style={{ minWidth: 0 }}>
                  {insight.insight_type && (
                    <div className="stat-cap" style={{ color: 'var(--accent)', marginTop: 0, marginBottom: 4 }}>
                      {insight.insight_type.toUpperCase()}
                    </div>
                  )}
                  <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.5 }}>{insight.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade log */}
      <div className="label rise rise-5" style={{ margin: '0 4px 12px' }}>Trade Log · {all.length}</div>

      {all.length === 0 ? (
        <div className="pcard rise rise-5" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '36px 16px' }}>
          — no trades captured yet —
        </div>
      ) : (
        <div className="card2 rise rise-5" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ color: 'var(--muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px 10px', fontWeight: 700, width: 110 }}>Date</th>
                  <th style={{ padding: '14px 16px 10px', fontWeight: 700, width: 80 }}>Symbol</th>
                  <th style={{ padding: '14px 16px 10px', fontWeight: 700, width: 70 }}>Side</th>
                  <th style={{ padding: '14px 16px 10px', fontWeight: 700, width: 90 }}>Entry</th>
                  <th style={{ padding: '14px 16px 10px', fontWeight: 700, width: 90 }}>Exit</th>
                  <th style={{ padding: '14px 16px 10px', fontWeight: 700, width: 100 }}>P&amp;L</th>
                  <th style={{ padding: '14px 16px 10px', fontWeight: 700 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {all.map(t => (
                  <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted)' }}>
                      {t.trade_date ? formatDate(t.trade_date) : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--foreground)', fontWeight: 700 }}>
                      {t.symbol}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span className="pillar-tag" style={{
                        color: t.direction === 'long' ? 'var(--green)' : 'var(--red)',
                        background: t.direction === 'long' ? 'var(--green-dim)' : 'var(--red-dim)',
                      }}>
                        {t.direction?.toUpperCase() ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--foreground-2)' }}>
                      {t.entry_price != null ? `$${t.entry_price.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--foreground-2)' }}>
                      {t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: (t.pnl ?? 0) > 0 ? 'var(--green)' : (t.pnl ?? 0) < 0 ? 'var(--red)' : 'var(--muted)',
                      }}>
                        {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', maxWidth: 300 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.notes ?? '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
