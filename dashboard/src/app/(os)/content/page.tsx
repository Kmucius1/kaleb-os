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
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div className="grad-icon" style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${meta.color}, color-mix(in srgb, ${meta.color} 55%, #000))`, borderRadius: 12 }}>
          <Clapperboard size={19} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Content Engine</h1>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}1f`, padding: '5px 11px', borderRadius: 20 }}>
          <SpaceIcon size={12} /> {space === 'dryp' ? 'DRYP · Clients' : 'Personal'}
        </span>
      </div>

      <div className="label rise rise-2" style={{ margin: '0 2px 14px' }}>
        {space === 'dryp' ? 'Client Brands' : 'Your Brands & Ventures'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {allBrands.map((b, idx) => {
          const accent = b.color ?? 'var(--accent)'
          const collab = (b.default_collab_with ?? []).length ? `collabs w/ ${b.default_collab_with!.join(', ')}` : 'solo'
          return (
            <Link key={b.id} href={`/content/${b.slug}`} style={{ textDecoration: 'none' }} className={`press rise rise-${Math.min(7, (idx % 5) + 2)}`}>
              <div className="pcard" style={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
                <span style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3.5, borderRadius: 4, background: accent }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="h-title" style={{ color: 'var(--foreground)', fontSize: 17 }}>{b.name}</span>
                  <ArrowRight size={16} color="var(--muted)" />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                  <span className="pillar-tag" style={{ color: accent, background: `${accent}1f` }}>{b.kind}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{collab}</span>
                  {b.status !== 'active' && <span style={{ fontSize: 11, color: 'var(--yellow)' }}>· {b.status}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Ideas', value: countFor(ideas as Row[], b.id), color: 'var(--foreground)' },
                    { label: 'Scripts', value: countFor(scripts as Row[], b.id), color: 'var(--foreground)' },
                    { label: 'Leads', value: leadsFor(b.id), color: 'var(--green)' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ color: s.color, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                      <div className="stat-cap" style={{ marginTop: 6 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {allBrands.length === 0 && (
        <div className="pcard rise rise-2" style={{ color: 'var(--muted)', fontSize: 13, marginTop: 14, lineHeight: 1.55 }}>
          {space === 'dryp'
            ? 'No DRYP client content brands yet. Clients with a social_media or ads_management service sync in here automatically.'
            : 'No personal brands yet — run the content engine migration to seed them.'}
        </div>
      )}
    </div>
  )
}
