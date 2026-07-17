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
    <span style={{ fontSize: 9, color, border: `1px solid ${color}`, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{text}</span>
  )

  return (
    <div style={{ padding: '24px 28px', maxWidth: 980 }}>
      <Link href="/content" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 11, textDecoration: 'none', marginBottom: 14 }}>
        <ArrowLeft size={12} /> All brands
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent }} />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16 }}>{brand.name}</span>
        <span style={{ color: accent, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{brand.kind}</span>
        {(brand.default_collab_with ?? []).length > 0 && (
          <span style={{ color: 'var(--muted)', fontSize: 10 }}>collabs w/ {brand.default_collab_with.join(', ')}</span>
        )}
      </div>

      <GeneratePanel brandSlug={brand.slug} accent={accent} />

      {/* SCRIPTS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
        <FileText size={13} color={accent} />
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', color: 'var(--foreground)' }}>SCRIPTS</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{(scripts ?? []).length}</span>
      </div>
      {(scripts ?? []).length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 24 }}>No scripts yet — generate one above.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {(scripts ?? []).map((s) => (
          <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <Badge text={PLATFORM_LABEL[s.platform] ?? s.platform} color={accent} />
              {s.pillar && <Badge text={s.pillar} />}
              {s.goal && <Badge text={`goal: ${s.goal}`} color="var(--blue)" />}
              {s.collab && <Badge text={`collab: ${(s.collab_with ?? []).join(', ') || 'yes'}`} color="var(--purple)" />}
              <Badge text={s.status} color="var(--yellow)" />
            </div>
            <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 15, marginBottom: 8, lineHeight: 1.35 }}>{s.hook}</div>
            {s.caption && <div style={{ color: 'var(--foreground-2)', fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 10, lineHeight: 1.5 }}>{s.caption}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {s.cta && <div><span style={{ color: 'var(--muted)' }}>CTA: </span><span style={{ color: 'var(--foreground-2)' }}>{s.cta}</span></div>}
              {s.thumbnail_text && <div><span style={{ color: 'var(--muted)' }}>Thumbnail: </span><span style={{ color: accent, fontWeight: 700 }}>{s.thumbnail_text}</span></div>}
              {s.target_audience && <div><span style={{ color: 'var(--muted)' }}>Audience: </span><span style={{ color: 'var(--foreground-2)' }}>{s.target_audience}</span></div>}
            </div>
            {(s.comment_ideas ?? []).length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 4, letterSpacing: '0.05em' }}>ENGAGEMENT COMMENTS</div>
                {(s.comment_ideas as string[]).map((c, i) => (
                  <div key={i} style={{ color: 'var(--foreground-2)', fontSize: 12, marginBottom: 3 }}>• {c}</div>
                ))}
              </div>
            )}
            <details style={{ marginTop: 10 }}>
              <summary style={{ color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>Full script / beats</summary>
              {s.body && <pre style={{ color: 'var(--foreground-2)', fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 8, lineHeight: 1.5 }}>{s.body}</pre>}
              {(s.beats ?? null) && (
                <div style={{ marginTop: 8 }}>
                  {(s.beats as { type: string; text: string }[]).map((bt, i) => (
                    <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: accent, textTransform: 'uppercase', fontSize: 10 }}>{bt.type}</span>{' '}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
        <Lightbulb size={13} color={accent} />
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', color: 'var(--foreground)' }}>IDEA QUEUE</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{(ideas ?? []).length}</span>
      </div>
      {(ideas ?? []).length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>No ideas yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(ideas ?? []).map((i) => (
          <div key={i.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--foreground)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
              {i.angle && <div style={{ color: 'var(--muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.angle}</div>}
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
