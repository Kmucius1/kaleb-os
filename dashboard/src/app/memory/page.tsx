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
    <div style={{ padding: '20px 28px', maxWidth: 1200 }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
          MEMORY BANK
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 10 }}>
          {active.length} active · {expired.length} expired · TTL 60 days (+30 on reference)
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 16 }}>
          Error: {error.message}
        </div>
      )}

      {all.length === 0 ? (
        <div style={{
          color: 'var(--muted)',
          fontSize: 11,
          padding: '60px 0',
          textAlign: 'center',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ marginBottom: 8 }}>— no memories extracted yet —</div>
          <div style={{ fontSize: 10, color: '#333' }}>
            Ask Atlas: "process my captures and extract key facts into memory"
          </div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>MEMORY</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 80 }}>CONF</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 120 }}>EXPIRES</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 120 }}>LAST REF</th>
            </tr>
          </thead>
          <tbody>
            {all.map((m, i) => {
              const isExpired = m.expires_at && new Date(m.expires_at) <= now
              return (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: '1px solid #161616',
                    background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    opacity: isExpired ? 0.4 : 1,
                  }}
                >
                  <td style={{ padding: '12px 16px 12px 0' }}>
                    <div style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: m.context_tags?.length ? 6 : 0, lineHeight: 1.5 }}>
                      {m.content}
                    </div>
                    {m.context_tags && m.context_tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.context_tags.map(tag => (
                          <span key={tag} style={{
                            fontSize: 9,
                            color: 'var(--accent)',
                            border: '1px solid rgba(255,102,0,0.25)',
                            padding: '1px 5px',
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: 11, color: 'var(--muted)', verticalAlign: 'top' }}>
                    {m.confidence_score != null ? `${Math.round(m.confidence_score * 100)}%` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: 11, color: isExpired ? 'var(--red)' : 'var(--muted)', verticalAlign: 'top' }}>
                    {m.expires_at ? formatDate(m.expires_at) : '—'}
                  </td>
                  <td style={{ padding: '12px 0', fontSize: 11, color: 'var(--muted)', verticalAlign: 'top' }}>
                    {m.last_referenced_at ? formatDate(m.last_referenced_at) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
