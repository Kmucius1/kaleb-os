import { supabase } from '@/lib/supabase'
import { Wallet, TrendingUp } from 'lucide-react'

export const revalidate = 60

export default async function SideHustlesPage() {
  const { data, error } = await supabase
    .from('side_hustles')
    .select('*')
    .order('revenue_mtd', { ascending: false })

  const hustles = data ?? []
  const activeHustles = hustles.filter(h => h.status === 'active')
  const totalMtd = hustles.reduce((sum, h) => sum + (h.revenue_mtd ?? 0), 0)
  const totalAllTime = hustles.reduce((sum, h) => sum + (h.revenue_total ?? 0), 0)

  function statusColor(s: string) {
    const map: Record<string, string> = {
      active: 'var(--green)',
      paused: 'var(--yellow)',
      inactive: 'var(--muted)',
    }
    return map[s] ?? 'var(--muted)'
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 22 }}>
        <span className="grad-icon breathe" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 12, flexShrink: 0 }}>
          <Wallet size={20} color="var(--accent)" />
        </span>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Side Hustles</h1>
          <p style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '4px 0 0' }}>Income streams outside the agency</p>
        </div>
      </div>

      {/* Stats */}
      <div className="rise rise-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{totalMtd > 0 ? `$${totalMtd.toLocaleString()}` : '—'}</div>
          <div className="stat-cap">MTD Income</div>
          <div className="stat-sub">this month</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--blue)' }}>{totalAllTime > 0 ? `$${totalAllTime.toLocaleString()}` : '—'}</div>
          <div className="stat-cap">All-Time</div>
          <div className="stat-sub">total earned</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{String(activeHustles.length || '—')}</div>
          <div className="stat-cap">Active</div>
          <div className="stat-sub">earning now</div>
        </div>
      </div>

      {/* Hustle list */}
      <div className="label rise rise-3" style={{ margin: '0 4px 12px' }}>Income Streams · {hustles.length}</div>

      {error || hustles.length === 0 ? (
        <div className="pcard rise rise-3" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 10 }}>No side hustles tracked yet.</div>
          <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.6 }}>
            Ask Atlas: &ldquo;add a side hustle: [name], category: [type], making $[amount] this month&rdquo;
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hustles.map((h: any, i: number) => {
            const color = statusColor(h.status)
            return (
              <div key={h.id} className={`pcard press rise rise-${Math.min(7, (i % 5) + 3)}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
                  <span className="grad-icon" style={{ width: 38, height: 38, background: `${color}1c`, borderRadius: 12, flexShrink: 0 }}>
                    <TrendingUp size={19} color={color} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                      <span className="pillar-tag" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)`, flexShrink: 0 }}>
                        {(h.status ?? 'active').toUpperCase()}
                      </span>
                    </div>
                    {h.category && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, textTransform: 'capitalize' }}>{h.category}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px' }}>
                    <div className="stat-num" style={{ fontSize: 19, color: 'var(--green)' }}>
                      {h.revenue_mtd > 0 ? `$${Number(h.revenue_mtd).toLocaleString()}` : '—'}
                    </div>
                    <div className="stat-cap">This Month</div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px' }}>
                    <div className="stat-num" style={{ fontSize: 19, color: 'var(--blue)' }}>
                      {h.revenue_total > 0 ? `$${Number(h.revenue_total).toLocaleString()}` : '—'}
                    </div>
                    <div className="stat-cap">All Time</div>
                  </div>
                </div>

                {h.notes && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 12, lineHeight: 1.5 }}>
                    {h.notes.slice(0, 120)}{h.notes.length > 120 ? '…' : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
