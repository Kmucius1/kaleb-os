import { supabase } from '@/lib/supabase'
import { TrendingUp, AlertTriangle } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 120

export default async function PatternsPage() {
  const [{ data: patterns }, { data: contradictions }] = await Promise.all([
    supabase.from('patterns').select('*').order('created_at', { ascending: false }),
    supabase.from('contradictions').select('*').order('created_at', { ascending: false }),
  ])

  const pats = patterns ?? []
  const cons = contradictions ?? []

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Patterns &amp; Contradictions</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, flexShrink: 0 }}><TrendingUp size={18} color="var(--accent)" /></span>
      </div>
      <p className="rise rise-1" style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '0 0 22px' }}>
        Signals Atlas surfaces from your behavior over time
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        {/* Patterns */}
        <div className="rise rise-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 12px' }}>
            <span className="grad-icon" style={{ width: 28, height: 28, background: 'var(--green-dim)', borderRadius: 9 }}><TrendingUp size={15} color="var(--green)" /></span>
            <span className="section-label" style={{ color: 'var(--green)' }}>Patterns</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{pats.length}</span>
          </div>
          {pats.length === 0 ? (
            <div className="pcard" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
              No patterns yet — Atlas will identify these over time
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pats.map((p: any, i: number) => (
                <div key={p.id} className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{ padding: '13px 15px', position: 'relative', overflow: 'hidden' }}>
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: 'var(--green)' }} />
                  <div style={{ fontSize: 13.5, color: 'var(--foreground)', marginBottom: 6, lineHeight: 1.5 }}>{p.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.pattern_type && <span className="pillar-tag" style={{ color: 'var(--green)', background: 'var(--green-dim)', textTransform: 'none', letterSpacing: 0 }}>{p.pattern_type}</span>}
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{formatTime(p.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contradictions */}
        <div className="rise rise-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 12px' }}>
            <span className="grad-icon" style={{ width: 28, height: 28, background: 'var(--red-dim)', borderRadius: 9 }}><AlertTriangle size={15} color="var(--red)" /></span>
            <span className="section-label" style={{ color: 'var(--red)' }}>Contradictions</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{cons.length}</span>
          </div>
          {cons.length === 0 ? (
            <div className="pcard" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
              No contradictions flagged — keep it that way
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cons.map((c: any, i: number) => (
                <div key={c.id} className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{ padding: '13px 15px', position: 'relative', overflow: 'hidden' }}>
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: 'var(--red)' }} />
                  <div style={{ fontSize: 13.5, color: 'var(--foreground)', marginBottom: 6, lineHeight: 1.5 }}>{c.description}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{formatTime(c.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
