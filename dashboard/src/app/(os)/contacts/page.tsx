import { supabase } from '@/lib/supabase'
import { Users } from 'lucide-react'

export const revalidate = 120

export default async function ContactsPage() {
  const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
  const all = data ?? []

  return (
    <div className="page-pad" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <Users size={20} color="var(--accent)" />
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Contacts</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{all.length} tracked</span>
      </div>
      {all.length === 0 ? (
        <div className="card2" style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ marginBottom: 8 }}>No contacts yet</div>
          <div style={{ fontSize: 11.5 }}>Ask Atlas: &ldquo;add [name] to my contacts as a [business/personal] contact&rdquo;</div>
        </div>
      ) : (
        <div className="card2" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: '0.09em', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>NAME</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 130 }}>RELATIONSHIP</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>CONTEXT</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 130 }}>LAST CONTACT</th>
              </tr>
            </thead>
            <tbody>
              {all.map((c: any, i: number) => (
                <tr key={c.id} className="row-hover" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--foreground)', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '12px 14px', fontSize: 11.5, color: 'var(--foreground-2)' }}>{c.relationship ?? '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)' }}>{c.context ?? '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{c.last_contact ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
