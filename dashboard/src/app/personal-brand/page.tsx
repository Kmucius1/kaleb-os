import { supabase } from '@/lib/supabase'
import { Star } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 120

export default async function PersonalBrandPage() {
  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })

  const all = ideas ?? []
  const contentIdeas = all.filter((i: any) => i.category === 'content' || !i.category)

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Star size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>PERSONAL BRAND</span>
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>"One System. Built to Win."</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'IDEAS CAPTURED', value: String(all.length), color: '#8b5cf6' },
          { label: 'AUDIENCE GROWTH', value: '—', color: 'var(--muted)' },
          { label: 'CONTENT PUBLISHED', value: '—', color: 'var(--muted)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px' }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 12 }}>
        CONTENT IDEAS ({all.length})
      </div>
      {all.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
          <div style={{ marginBottom: 8 }}>— no ideas captured yet —</div>
          <div style={{ fontSize: 10, color: '#333' }}>Ask Atlas: "surface content ideas from my captures and voice notes"</div>
        </div>
      ) : (
        all.map((idea: any) => (
          <div key={idea.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--foreground)', fontWeight: 600, marginBottom: 3 }}>{idea.title}</div>
              {idea.description && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{idea.description.slice(0, 100)}</div>}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{formatTime(idea.created_at)}</div>
          </div>
        ))
      )}
    </div>
  )
}
