import { supabase } from '@/lib/supabase'
import { Users, Clock } from 'lucide-react'

export const revalidate = 120

function relColor(rel: string | null) {
  const r = (rel ?? '').toLowerCase()
  if (r.includes('business') || r.includes('client') || r.includes('work')) return 'var(--money)'
  if (r.includes('family') || r.includes('partner')) return 'var(--relationships)'
  if (r.includes('friend') || r.includes('personal')) return 'var(--mind)'
  return 'var(--accent)'
}

export default async function ContactsPage() {
  const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
  const all = data ?? []

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Contacts</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><Users size={18} color="var(--accent)" /></span>
      </div>
      <p className="rise rise-1" style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '0 0 20px' }}>{all.length} tracked</p>

      {all.length === 0 ? (
        <div className="pcard rise rise-2" style={{ padding: '52px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ marginBottom: 8, color: 'var(--foreground-2)' }}>No contacts yet</div>
          <div style={{ fontSize: 12 }}>Ask Atlas: &ldquo;add [name] to my contacts as a [business/personal] contact&rdquo;</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {all.map((c: any, i: number) => {
            const color = relColor(c.relationship)
            const initial = (c.name ?? '?').trim().charAt(0).toUpperCase() || '?'
            return (
              <div key={c.id} className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 15px' }}>
                <span className="grad-icon" style={{ width: 42, height: 42, background: `${color}1c`, borderRadius: 13, flexShrink: 0, fontSize: 17, fontWeight: 700, color }}>{initial}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{c.name}</span>
                    {c.relationship && <span className="pillar-tag" style={{ color, background: `${color}1f`, textTransform: 'none', letterSpacing: 0, marginLeft: 'auto' }}>{c.relationship}</span>}
                  </div>
                  {c.context && <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.45 }}>{c.context}</div>}
                  {c.last_contact && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                      <Clock size={11} /> Last contact {c.last_contact}
                    </div>
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
