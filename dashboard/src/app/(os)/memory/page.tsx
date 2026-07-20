import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Brain, Clock, RefreshCw } from 'lucide-react'

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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Memory Bank</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><Brain size={18} color="var(--accent)" /></span>
      </div>
      <p className="rise rise-1" style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '0 0 20px' }}>
        TTL 60 days · auto-renews +30 on reference
      </p>

      {error && (
        <div className="pcard rise rise-2" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 16, borderColor: 'var(--red)' }}>
          Error: {error.message}
        </div>
      )}

      {all.length > 0 && (
        <div className="rise rise-2" style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          <div className="stat-tile" style={{ flex: 1 }}>
            <div className="stat-num" style={{ color: 'var(--green)' }}>{active.length}</div>
            <div className="stat-cap" style={{ color: 'var(--green)' }}>Active</div>
          </div>
          <div className="stat-tile" style={{ flex: 1 }}>
            <div className="stat-num" style={{ color: 'var(--muted)' }}>{expired.length}</div>
            <div className="stat-cap">Expired</div>
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <div className="pcard rise rise-3" style={{ color: 'var(--muted)', fontSize: 13, padding: '52px 20px', textAlign: 'center' }}>
          <div style={{ marginBottom: 8, color: 'var(--foreground-2)' }}>No memories extracted yet</div>
          <div style={{ fontSize: 12 }}>
            Ask Atlas: &ldquo;process my captures and extract key facts into memory&rdquo;
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {all.map((m, i) => {
            const isExpired = m.expires_at && new Date(m.expires_at) <= now
            const conf = m.confidence_score != null ? Math.round(m.confidence_score * 100) : null
            return (
              <div key={m.id} className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{ padding: '15px 17px', opacity: isExpired ? 0.5 : 1 }}>
                <div style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.5, marginBottom: (m.context_tags?.length || conf != null) ? 10 : 0 }}>
                  {m.content}
                </div>
                {m.context_tags && m.context_tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                    {m.context_tags.map(tag => (
                      <span key={tag} className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)', textTransform: 'none', letterSpacing: 0 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
                  {conf != null && (
                    <span style={{ color: conf >= 70 ? 'var(--green)' : 'var(--foreground-2)', fontWeight: 600 }}>{conf}% confidence</span>
                  )}
                  {m.expires_at && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isExpired ? 'var(--red)' : 'var(--muted)' }}>
                      <Clock size={11} /> {isExpired ? 'expired' : 'expires'} {formatDate(m.expires_at)}
                    </span>
                  )}
                  {m.last_referenced_at && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={11} /> {formatDate(m.last_referenced_at)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
