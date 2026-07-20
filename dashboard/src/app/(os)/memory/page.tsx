import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

export const revalidate = 60

type Memory = {
  id: string
  content: string
  source_ref: string | null
  context_tags: string[] | null
  confidence_score: number | null
  expires_at: string | null
  last_referenced_at: string | null
  created_at: string
}

export default async function MemoryPage() {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false })

  const all: Memory[] = data ?? []
  const now = new Date()
  const active = all.filter(m => !m.expires_at || new Date(m.expires_at) > now)
  const expired = all.filter(m => m.expires_at && new Date(m.expires_at) <= now)

  return (
    <div className="page-pad" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Memory Bank</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {active.length} active · {expired.length} expired · TTL 60 days (+30 on reference)
        </span>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 16 }}>
          Error: {error.message}
        </div>
      )}

      {all.length === 0 ? (
        <div className="card2" style={{ color: 'var(--muted)', fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>No memories extracted yet</div>
          <div style={{ fontSize: 11.5 }}>
            Ask Atlas: &ldquo;process my captures and extract key facts into memory&rdquo;
          </div>
        </div>
      ) : (
        <div className="card2" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: '0.09em', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>MEMORY</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 70 }}>CONF</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 120 }}>EXPIRES</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 120 }}>LAST REF</th>
              </tr>
            </thead>
            <tbody>
              {all.map((m, i) => {
                const isExpired = m.expires_at && new Date(m.expires_at) <= now
                return (
                  <tr
                    key={m.id}
                    style={{
                      borderTop: i ? '1px solid var(--border)' : 'none',
                      opacity: isExpired ? 0.45 : 1,
                    }}
                  >
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--foreground)', marginBottom: m.context_tags?.length ? 7 : 0, lineHeight: 1.5 }}>
                        {m.content}
                      </div>
                      {m.context_tags && m.context_tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {m.context_tags.map(tag => (
                            <span key={tag} className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)', textTransform: 'none', letterSpacing: 0 }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 11.5, color: 'var(--foreground-2)', verticalAlign: 'top' }}>
                      {m.confidence_score != null ? `${Math.round(m.confidence_score * 100)}%` : '—'}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 11.5, color: isExpired ? 'var(--red)' : 'var(--muted)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {m.expires_at ? formatDate(m.expires_at) : '—'}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 11.5, color: 'var(--muted)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {m.last_referenced_at ? formatDate(m.last_referenced_at) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
