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
      active: '#22c55e',
      paused: '#f59e0b',
      inactive: 'var(--muted)',
    }
    return map[s] ?? 'var(--muted)'
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Wallet size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>SIDE HUSTLES</span>
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>income streams outside the agency</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'MTD INCOME', value: totalMtd > 0 ? `$${totalMtd.toLocaleString()}` : '—', color: '#22c55e' },
          { label: 'ALL-TIME TOTAL', value: totalAllTime > 0 ? `$${totalAllTime.toLocaleString()}` : '—', color: '#3b82f6' },
          { label: 'ACTIVE STREAMS', value: String(activeHustles.length || '—'), color: 'var(--accent)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px' }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Hustle list */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 12 }}>
        INCOME STREAMS ({hustles.length})
      </div>

      {error || hustles.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>— no side hustles tracked yet —</div>
          <div style={{ fontSize: 10, color: '#333', lineHeight: 1.8 }}>
            Tell Hermes: &ldquo;add a side hustle: [name], category: [type], making $[amount] this month&rdquo;
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {hustles.map((h: any) => (
            <div key={h.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>{h.name}</div>
                  {h.category && <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{h.category}</div>}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: statusColor(h.status), border: `1px solid ${statusColor(h.status)}44`, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>
                  {(h.status ?? 'active').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: h.notes ? 8 : 0 }}>
                <div style={{ background: '#0f0f0f', borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>THIS MONTH</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>
                    {h.revenue_mtd > 0 ? `$${Number(h.revenue_mtd).toLocaleString()}` : '—'}
                  </div>
                </div>
                <div style={{ background: '#0f0f0f', borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>ALL TIME</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                    {h.revenue_total > 0 ? `$${Number(h.revenue_total).toLocaleString()}` : '—'}
                  </div>
                </div>
              </div>

              {h.notes && (
                <div style={{ fontSize: 10, color: 'var(--muted)', borderTop: '1px solid #1a1a1a', paddingTop: 8, marginTop: 4 }}>
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
