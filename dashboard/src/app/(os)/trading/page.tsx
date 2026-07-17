import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

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
  const worstTrade = all.length > 0 ? all.reduce((w, t) => (t.pnl ?? Infinity) < (w.pnl ?? Infinity) ? t : w) : null

  const hasData = all.length > 0

  return (
    <div style={{ padding: '20px 28px', maxWidth: 1200 }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
          TRADING
        </div>
        <span style={{
          fontSize: 9,
          color: hasData ? 'var(--accent)' : 'var(--muted)',
          border: `1px solid ${hasData ? 'rgba(255,102,0,0.4)' : 'var(--border)'}`,
          padding: '2px 6px',
          letterSpacing: '0.06em',
        }}>
          PHASE 7
        </span>
        {hasData && (
          <div style={{ color: 'var(--muted)', fontSize: 10 }}>{all.length} trades tracked</div>
        )}
      </div>

      {!hasData && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid #222',
          padding: '20px 24px',
          marginBottom: 28,
        }}>
          <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.08em', marginBottom: 8 }}>
            PHASE 7 — NOT YET ACTIVE
          </div>
          <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.7, marginBottom: 12 }}>
            Phase 7 activates trading discipline tracking. Connect TradePrint via n8n webhook to
            auto-capture trades. Atlas will track P&L, identify patterns, and surface discipline insights.
          </div>
          <div style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>
            Activate: build TradePrint → n8n → trading_raw webhook (Phase 3 remaining item)
          </div>
        </div>
      )}

      {/* P&L stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        <TradeStat
          label="TOTAL P&L"
          value={hasData ? `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}` : '—'}
          color={hasData ? (totalPnl >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)'}
        />
        <TradeStat
          label="TRADES"
          value={hasData ? String(all.length) : '—'}
        />
        <TradeStat
          label="WIN RATE"
          value={winRate != null ? `${winRate}%` : '—'}
          color={winRate != null ? (winRate >= 50 ? 'var(--green)' : 'var(--red)') : 'var(--muted)'}
        />
        <TradeStat
          label="BEST TRADE"
          value={bestTrade?.pnl != null ? `+$${bestTrade.pnl.toFixed(2)}` : '—'}
          color={bestTrade?.pnl != null ? 'var(--green)' : 'var(--muted)'}
        />
      </div>

      {/* Insights */}
      {allInsights.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>
            ATLAS INSIGHTS ({allInsights.length})
          </div>
          {allInsights.map(insight => (
            <div key={insight.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
              padding: '12px 16px',
              marginBottom: 8,
            }}>
              {insight.insight_type && (
                <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
                  {insight.insight_type.toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--foreground)' }}>{insight.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trade log */}
      <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>
        TRADE LOG ({all.length})
      </div>

      {all.length === 0 ? (
        <div style={{
          color: 'var(--muted)',
          fontSize: 11,
          padding: '40px 0',
          textAlign: 'center',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          — no trades captured yet —
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 100 }}>DATE</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 80 }}>SYMBOL</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 70 }}>SIDE</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 90 }}>ENTRY</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 90 }}>EXIT</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 100 }}>P&L</th>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>NOTES</th>
            </tr>
          </thead>
          <tbody>
            {all.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #161616', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ padding: '8px 16px 8px 0', fontSize: 11, color: 'var(--muted)' }}>
                  {t.trade_date ? formatDate(t.trade_date) : '—'}
                </td>
                <td style={{ padding: '8px 16px 8px 0', fontSize: 12, color: 'var(--foreground)', fontWeight: 700 }}>
                  {t.symbol}
                </td>
                <td style={{ padding: '8px 16px 8px 0' }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: t.direction === 'long' ? 'var(--green)' : 'var(--red)',
                    letterSpacing: '0.06em',
                  }}>
                    {t.direction?.toUpperCase() ?? '—'}
                  </span>
                </td>
                <td style={{ padding: '8px 16px 8px 0', fontSize: 11, color: 'var(--muted)' }}>
                  {t.entry_price != null ? `$${t.entry_price.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '8px 16px 8px 0', fontSize: 11, color: 'var(--muted)' }}>
                  {t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '8px 16px 8px 0' }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: (t.pnl ?? 0) > 0 ? 'var(--green)' : (t.pnl ?? 0) < 0 ? 'var(--red)' : 'var(--muted)',
                  }}>
                    {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '—'}
                  </span>
                </td>
                <td style={{ padding: '8px 0', maxWidth: 300 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.notes ?? '—'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function TradeStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '14px 16px' }}>
      <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? 'var(--foreground)', lineHeight: 1 }}>{value}</div>
    </div>
  )
}
