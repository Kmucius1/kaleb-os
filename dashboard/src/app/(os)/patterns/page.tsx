import { supabase } from '@/lib/supabase'
import { TrendingUp } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 120

export default async function PatternsPage() {
  const [{ data: patterns }, { data: contradictions }] = await Promise.all([
    supabase.from('patterns').select('*').order('created_at', { ascending: false }),
    supabase.from('contradictions').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <div className="page-pad" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <TrendingUp size={20} color="var(--accent)" />
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Patterns &amp; Contradictions</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div>
          <div className="section-label" style={{ color: 'var(--green)', marginBottom: 12 }}>Patterns ({(patterns ?? []).length})</div>
          {(patterns ?? []).length === 0 ? (
            <div className="card2" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
              No patterns yet — Atlas will identify these over time
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(patterns ?? []).map((p: any) => (
                <div key={p.id} className="card2" style={{ borderLeft: '3px solid var(--green)', padding: '13px 15px' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--foreground)', marginBottom: 5, lineHeight: 1.5 }}>{p.description}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{p.pattern_type} · {formatTime(p.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="section-label" style={{ color: 'var(--red)', marginBottom: 12 }}>Contradictions ({(contradictions ?? []).length})</div>
          {(contradictions ?? []).length === 0 ? (
            <div className="card2" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
              No contradictions flagged — keep it that way
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(contradictions ?? []).map((c: any) => (
                <div key={c.id} className="card2" style={{ borderLeft: '3px solid var(--red)', padding: '13px 15px' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--foreground)', marginBottom: 5, lineHeight: 1.5 }}>{c.description}</div>
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
