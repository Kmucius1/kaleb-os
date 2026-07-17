import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import type { LandingCopy } from '@/lib/commerce-providers/types'

export const dynamic = 'force-dynamic'

const ACCENT = '#6366f1'

// SECURITY: explicit column whitelist — never `select('*')`. This table also
// holds supplier_url/supplier_cost/supplier_cost_real/est_margin/sourcing_notes/
// reasoning/score_total, which must NEVER reach this public, unauthenticated page.
type PublicProduct = {
  name: string
  slug: string
  description: string | null
  suggested_price: number | null
  image_url: string | null
  landing_copy: LandingCopy | null
  checkout_url: string | null
  build_status: string
}

async function getProduct(slug: string): Promise<PublicProduct | null> {
  const { data } = await supabase
    .from('commerce_products')
    .select('name, slug, description, suggested_price, image_url, landing_copy, checkout_url, build_status')
    .eq('slug', slug)
    .in('build_status', ['ready', 'live'])
    .single()
  return (data as PublicProduct | null) ?? null
}

const money = (n: number | null | undefined) => (n == null ? null : '$' + Number(n).toFixed(2))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const p = await getProduct(slug)
  if (!p) return {}

  const copy = p.landing_copy
  const title = copy?.seoTitle || p.name
  const description = copy?.seoDescription || p.description || `Shop ${p.name}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.image_url ? [p.image_url] : [],
    },
  }
}

export default async function ShopProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const p = await getProduct(slug)
  if (!p) notFound()

  const copy = p.landing_copy
  const headline = copy?.headline || p.name
  const subhead = copy?.subhead || p.description || ''
  const heroBadge = copy?.heroBadge || 'Featured'
  const bullets = copy?.bullets?.length ? copy.bullets : []
  const features = copy?.features?.length ? copy.features : []
  const socialProof = copy?.socialProof?.length ? copy.socialProof : []
  const faq = copy?.faq?.length ? copy.faq : []
  const guarantee = copy?.guarantee
  const urgency = copy?.urgency
  const ctaLabel = copy?.cta || 'Buy Now'
  const priceLabel = money(p.suggested_price)
  const canBuy = Boolean(p.checkout_url)

  return (
    <div style={{ paddingBottom: 88 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Hero */}
        <section style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              background: '#eef0ff',
              color: ACCENT,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              borderRadius: 999,
              padding: '5px 14px',
              marginBottom: 16,
            }}
          >
            {heroBadge}
          </span>

          <h1
            style={{
              fontSize: 'clamp(28px, 6vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: '0 0 12px',
            }}
          >
            {headline}
          </h1>

          {subhead && (
            <p style={{ fontSize: 17, color: '#4b5563', lineHeight: 1.55, margin: '0 auto 24px', maxWidth: 560 }}>
              {subhead}
            </p>
          )}

          {p.image_url && (
            <img
              src={p.image_url}
              alt={p.name}
              referrerPolicy="no-referrer"
              loading="eager"
              style={{
                maxWidth: '100%',
                width: '100%',
                maxHeight: 420,
                objectFit: 'cover',
                borderRadius: 20,
                border: '1px solid #e5e7eb',
                margin: '0 0 24px',
              }}
            />
          )}

          {priceLabel && (
            <div style={{ fontSize: 32, fontWeight: 800, margin: '0 0 18px' }}>{priceLabel}</div>
          )}

          <CtaButton checkoutUrl={p.checkout_url} label={ctaLabel} full />

          {urgency && (
            <div style={{ fontSize: 13, color: '#b45309', marginTop: 12, fontWeight: 600 }}>{urgency}</div>
          )}
        </section>

        {/* Bullets */}
        {bullets.length > 0 && (
          <section style={{ margin: '48px 0' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 16, lineHeight: 1.5 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: ACCENT,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    ✓
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Features */}
        {features.length > 0 && (
          <section style={{ margin: '48px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {features.map((f, i) => (
                <div
                  key={i}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: '20px 18px',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>{f.body}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Social proof */}
        {socialProof.length > 0 && (
          <section style={{ margin: '48px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {socialProof.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: '18px 20px',
                  }}
                >
                  <div style={{ color: '#f59e0b', fontSize: 14, marginBottom: 8, letterSpacing: 2 }}>★★★★★</div>
                  <div style={{ fontSize: 15, lineHeight: 1.55, color: '#111827', fontStyle: 'italic' }}>
                    &ldquo;{s.quote}&rdquo;
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8, fontWeight: 600 }}>— {s.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section style={{ margin: '48px 0' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {faq.map((item, i) => (
                <details
                  key={i}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '14px 18px',
                  }}
                >
                  <summary style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{item.q}</summary>
                  <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.55, marginTop: 10 }}>{item.a}</div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Guarantee */}
        {guarantee && (
          <section
            style={{
              margin: '48px 0 0',
              textAlign: 'center',
              padding: '20px',
              background: '#eef0ff',
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 600,
              color: '#3730a3',
            }}
          >
            {guarantee}
          </section>
        )}
      </div>

      {/* Sticky mobile CTA bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 40,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {priceLabel && <div style={{ fontSize: 18, fontWeight: 800, flexShrink: 0 }}>{priceLabel}</div>}
        <div style={{ flex: 1 }}>
          <CtaButton checkoutUrl={p.checkout_url} label={ctaLabel} full />
        </div>
      </div>

      {!canBuy && (
        <noscript />
      )}
    </div>
  )
}

function CtaButton({
  checkoutUrl,
  label,
  full,
}: {
  checkoutUrl: string | null
  label: string
  full?: boolean
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 12,
    padding: '14px 28px',
    width: full ? '100%' : undefined,
    textDecoration: 'none',
    border: 'none',
  }

  if (checkoutUrl) {
    return (
      <a
        href={checkoutUrl}
        style={{
          ...base,
          background: ACCENT,
          color: '#ffffff',
          boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
        }}
      >
        {label}
      </a>
    )
  }

  return (
    <button
      disabled
      style={{
        ...base,
        background: '#e5e7eb',
        color: '#9ca3af',
        cursor: 'not-allowed',
      }}
    >
      Launching soon
    </button>
  )
}
