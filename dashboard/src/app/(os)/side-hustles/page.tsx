import { supabase } from '@/lib/supabase'
import { Wallet } from 'lucide-react'

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
    <div className="page-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <Wallet size={18} color="var(--accent)" />
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Side Hustles</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>income streams outside the agency</span>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ margin: '0 0 26px' }}>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{totalMtd > 0 ? `$${totalMtd.toLocaleString()}` : '—'}</div>
          <div className="stat-cap">MTD Income</div>
          <div className="stat-sub">this month</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--blue)' }}>{totalAllTime > 0 ? `$${totalAllTime.toLocaleString()}` : '—'}</div>
          <div className="stat-cap">All-Time Total</div>
          <div className="stat-sub">total earned</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{String(activeHustles.length || '—')}</div>
          <div className="stat-cap">Active Streams</div>
          <div className="stat-sub">earning now</div>
        </div>
      </div>

      {/* Hustle list */}
      <div className="section-label" style={{ marginBottom: 12 }}>Income Streams · {hustles.length}</div>

      {error || hustles.length === 0 ? (
        <div className="card2" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 10 }}>No side hustles tracked yet.</div>
          <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.6 }}>
            Ask Atlas: &ldquo;add a side hustle: [name], category: [type], making $[amount] this month&rdquo;
          </div>
        </div>
      ) : (
        <div className="card-list">
          {hustles.map((h: any) => (
            <div key={h.id} className="list-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                  {h.category && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, textTransform: 'capitalize' }}>{h.category}</div>}
                </div>
                <span className="pillar-tag" style={{ color: statusColor(h.status), background: `color-mix(in srgb, ${statusColor(h.status)} 14%, transparent)` }}>
                  {(h.status ?? 'active').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
                  <div className="stat-num" style={{ fontSize: 19, color: 'var(--green)' }}>
                    {h.revenue_mtd > 0 ? `$${Number(h.revenue_mtd).toLocaleString()}` : '—'}
                  </div>
                  <div className="stat-cap">This Month</div>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
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
          ))}
        </div>
      )}
    </div>
  )
}
