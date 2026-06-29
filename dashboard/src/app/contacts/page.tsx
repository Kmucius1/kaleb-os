import { supabase } from '@/lib/supabase'
import { Users } from 'lucide-react'

export const revalidate = 120

export default async function ContactsPage() {
  const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
  const all = data ?? []

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Users size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>CONTACTS</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{all.length} tracked</span>
      </div>
      {all.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
          <div style={{ marginBottom: 8 }}>— no contacts yet —</div>
          <div style={{ fontSize: 10, color: '#333' }}>Ask Atlas: "add [name] to my contacts as a [business/personal] contact"</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>NAME</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 120 }}>RELATIONSHIP</th>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>CONTEXT</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 120 }}>LAST CONTACT</th>
            </tr>
          </thead>
          <tbody>
            {all.map((c: any, i: number) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #161616' }}>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 12, color: 'var(--foreground)', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 10, color: 'var(--muted)' }}>{c.relationship ?? '—'}</td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 11, color: 'var(--muted)' }}>{c.context ?? '—'}</td>
                <td style={{ padding: '10px 0', fontSize: 10, color: 'var(--muted)' }}>{c.last_contact ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
