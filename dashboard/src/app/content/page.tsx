import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Clapperboard, ArrowRight, User, Building2 } from 'lucide-react'
import { getSpace, brandSpace, SPACE_META } from '@/lib/space'

export const dynamic = 'force-dynamic'

type Brand = { id: string; slug: string; name: string; kind: string; color: string | null; status: string; default_collab_with: string[] | null }
type Row = { brand_id: string; status: string }

export default async function ContentOverview() {
  const [{ data: brands }, { data: ideas }, { data: scripts }, { data: posts }, space] = await Promise.all([
    supabase.from('brands').select('id,slug,name,kind,color,status,default_collab_with').order('created_at'),
    supabase.from('content_ideas').select('brand_id,status'),
    supabase.from('content_scripts').select('brand_id,status'),
    supabase.from('content_posts').select('brand_id,leads'),
    getSpace(),
  ])

  // STRICT wall: only show brands that belong to the active space.
  // personal = me + ventures (Ka1eb.ai, trading, future); dryp = clients.
  const allBrands = ((brands ?? []) as Brand[]).filter(b => brandSpace(b.kind) === space)
  const meta = SPACE_META[space]
  const SpaceIcon = space === 'dryp' ? Building2 : User
  const countFor = (rows: Row[] | null, id: string) => (rows ?? []).filter(r => r.brand_id === id).length
  const leadsFor = (id: string) => ((posts ?? []) as { brand_id: string; leads: number | null }[])
    .filter(p => p.brand_id === id).reduce((s, p) => s + (p.leads ?? 0), 0)

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <Clapperboard size={16} color={meta.color} />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>CONTENT ENGINE</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}1f`, padding: '3px 9px', borderRadius: 20 }}>
          <SpaceIcon size={12} /> {space === 'dryp' ? 'DRYP · Clients' : 'Personal'}
        </span>
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 11, margin: '18px 0 12px', letterSpacing: '0.08em' }}>
        {space === 'dryp' ? 'CLIENT BRANDS' : 'YOUR BRANDS & VENTURES'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {allBrands.map((b) => {
          const accent = b.color ?? 'var(--accent)'
          const collab = (b.default_collab_with ?? []).length ? `collabs w/ ${b.default_collab_with!.join(', ')}` : 'solo'
          return (
            <Link key={b.id} href={`/content/${b.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: 16, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 14 }}>{b.name}</span>
                  <ArrowRight size={14} color="var(--muted)" />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 10, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.kind}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>· {collab}</span>
                  {b.status !== 'active' && <span style={{ fontSize: 10, color: 'var(--yellow)' }}>· {b.status}</span>}
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'IDEAS', value: countFor(ideas as Row[], b.id) },
                    { label: 'SCRIPTS', value: countFor(scripts as Row[], b.id) },
                    { label: 'LEADS', value: leadsFor(b.id) },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 9, letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {allBrands.length === 0 && (
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 20 }}>
          {space === 'dryp'
            ? 'No DRYP client content brands yet. Clients with a social_media or ads_management service sync in here automatically.'
            : 'No personal brands yet — run the content engine migration to seed them.'}
        </div>
      )}
    </div>
  )
}
