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
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <TrendingUp size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>PATTERNS & CONTRADICTIONS</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 12 }}>PATTERNS ({(patterns ?? []).length})</div>
          {(patterns ?? []).length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
              — no patterns yet — Atlas will identify these over time
            </div>
          ) : (
            (patterns ?? []).map((p: any) => (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid #22c55e', borderRadius: 6, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--foreground)', marginBottom: 4 }}>{p.description}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)' }}>{p.pattern_type} · {formatTime(p.created_at)}</div>
              </div>
            ))
          )}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.1em', marginBottom: 12 }}>CONTRADICTIONS ({(contradictions ?? []).length})</div>
          {(contradictions ?? []).length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
              — no contradictions flagged — keep it that way
            </div>
          ) : (
            (contradictions ?? []).map((c: any) => (
              <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--foreground)', marginBottom: 4 }}>{c.description}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)' }}>{formatTime(c.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
