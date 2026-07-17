import { supabase } from '@/lib/supabase'
import { FolderOpen } from 'lucide-react'

export const revalidate = 120

export default async function ProjectsPage() {
  const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  const all = data ?? []

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <FolderOpen size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>PROJECTS</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{all.length} total</span>
      </div>
      {all.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
          <div style={{ marginBottom: 8 }}>— no projects yet —</div>
          <div style={{ fontSize: 10, color: '#333' }}>Ask Atlas: "create a project for [name]"</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {all.map((p: any) => (
            <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>{p.name}</div>
              {p.description && <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{p.description}</div>}
              <div style={{ marginTop: 10, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.06em' }}>{p.status?.toUpperCase() ?? 'ACTIVE'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
