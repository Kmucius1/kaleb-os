import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Lightbulb, FileText } from 'lucide-react'
import GeneratePanel from '@/components/GeneratePanel'

export const dynamic = 'force-dynamic'

const PLATFORM_LABEL: Record<string, string> = {
  reels: 'REEL', linkedin: 'LINKEDIN', x: 'X/THREAD', youtube: 'YOUTUBE',
}

export default async function BrandWorkspace({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: slug } = await params
  const { data: brand } = await supabase.from('brands').select('*').eq('slug', slug).single()
  if (!brand) notFound()
  const accent: string = brand.color ?? 'var(--accent)'

  const [{ data: ideas }, { data: scripts }] = await Promise.all([
    supabase.from('content_ideas').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('content_scripts').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false }).limit(20),
  ])

  const Badge = ({ text, color = 'var(--muted)' }: { text: string; color?: string }) => (
    <span style={{ fontSize: 9.5, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 14%, transparent)`, borderRadius: 6, padding: '3px 8px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{text}</span>
  )

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '18px 16px 40px' }}>
      <Link href="/content" className="press rise rise-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12, fontWeight: 600, textDecoration: 'none', marginBottom: 18 }}>
        <ArrowLeft size={13} /> All brands
      </Link>

      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <span className="grad-icon breathe" style={{ width: 40, height: 40, background: `${accent}1c`, borderRadius: 12, flexShrink: 0 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: accent, boxShadow: `0 0 12px ${accent}` }} />
        </span>
        <span className="h-hero" style={{ color: 'var(--foreground)', fontSize: 24 }}>{brand.name}</span>
        <span className="pillar-tag" style={{ color: accent, background: `${accent}1f` }}>{brand.kind}</span>
        {(brand.default_collab_with ?? []).length > 0 && (
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>collabs w/ {brand.default_collab_with.join(', ')}</span>
        )}
      </div>

      <div className="rise rise-2" style={{ marginBottom: 30 }}>
        <GeneratePanel brandSlug={brand.slug} accent={accent} />
      </div>

      {/* SCRIPTS */}
      <div className="rise rise-3" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="grad-icon" style={{ width: 34, height: 34, background: `${accent}1c`, borderRadius: 11, flexShrink: 0 }}><FileText size={16} color={accent} /></span>
        <span className="label">Scripts</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginLeft: 'auto' }}>{(scripts ?? []).length}</span>
      </div>
      {(scripts ?? []).length === 0 && <div className="pcard rise rise-3" style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 30 }}>No scripts yet — generate one above.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 34 }}>
        {(scripts ?? []).map((s, idx) => (
          <div key={s.id} className={`pcard rise rise-${Math.min(7, (idx % 4) + 3)}`}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <Badge text={PLATFORM_LABEL[s.platform] ?? s.platform} color={accent} />
              {s.pillar && <Badge text={s.pillar} />}
              {s.goal && <Badge text={`goal: ${s.goal}`} color="var(--blue)" />}
              {s.collab && <Badge text={`collab: ${(s.collab_with ?? []).join(', ') || 'yes'}`} color="var(--purple)" />}
              <Badge text={s.status} color="var(--yellow)" />
            </div>
            <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, marginBottom: 8, lineHeight: 1.35, letterSpacing: '-0.01em' }}>{s.hook}</div>
            {s.caption && <div style={{ color: 'var(--foreground-2)', fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 12, lineHeight: 1.55 }}>{s.caption}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
              {s.cta && <div><span style={{ color: 'var(--muted)' }}>CTA: </span><span style={{ color: 'var(--foreground-2)' }}>{s.cta}</span></div>}
              {s.thumbnail_text && <div><span style={{ color: 'var(--muted)' }}>Thumbnail: </span><span style={{ color: accent, fontWeight: 700 }}>{s.thumbnail_text}</span></div>}
              {s.target_audience && <div><span style={{ color: 'var(--muted)' }}>Audience: </span><span style={{ color: 'var(--foreground-2)' }}>{s.target_audience}</span></div>}
            </div>
            {(s.comment_ideas ?? []).length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div className="label" style={{ marginBottom: 8 }}>Engagement Comments</div>
                {(s.comment_ideas as string[]).map((c, i) => (
                  <div key={i} style={{ color: 'var(--foreground-2)', fontSize: 12.5, marginBottom: 3 }}>• {c}</div>
                ))}
              </div>
            )}
            <details style={{ marginTop: 12 }}>
              <summary style={{ color: 'var(--muted)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Full script / beats</summary>
              {s.body && <pre style={{ color: 'var(--foreground-2)', fontSize: 12.5, whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 8, lineHeight: 1.55 }}>{s.body}</pre>}
              {(s.beats ?? null) && (
                <div style={{ marginTop: 8 }}>
                  {(s.beats as { type: string; text: string }[]).map((bt, i) => (
                    <div key={i} style={{ fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: accent, textTransform: 'uppercase', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>{bt.type}</span>{' '}
                      <span style={{ color: 'var(--foreground-2)' }}>{bt.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </details>
          </div>
        ))}
      </div>

      {/* IDEA QUEUE */}
      <div className="rise rise-3" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="grad-icon" style={{ width: 34, height: 34, background: `${accent}1c`, borderRadius: 11, flexShrink: 0 }}><Lightbulb size={16} color={accent} /></span>
        <span className="label">Idea Queue</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginLeft: 'auto' }}>{(ideas ?? []).length}</span>
      </div>
      {(ideas ?? []).length === 0 && <div className="pcard rise rise-3" style={{ color: 'var(--muted)', fontSize: 13 }}>No ideas yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(ideas ?? []).map((i, idx) => (
          <div key={i.id} className={`pcard press rise rise-${Math.min(7, (idx % 5) + 3)}`} style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--foreground)', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
              {i.angle && <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.angle}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {i.platform && <Badge text={PLATFORM_LABEL[i.platform] ?? i.platform} color={accent} />}
              <Badge text={i.status} color="var(--yellow)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
