import { getTodayReviews, getWeather } from '@/lib/briefing'
import { getTodaySchedule } from '@/lib/schedule'
import GenerateBriefButton from '@/components/GenerateBriefButton'
import Link from 'next/link'
import { Sunrise, CloudSun, Target, CalendarDays, Moon } from 'lucide-react'

export const dynamic = 'force-dynamic'

const dateLong = () => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }).format(new Date())

// Tiny markdown renderer: ## headers, - bullets, paragraphs.
function Body({ md }: { md: string }) {
  const lines = md.split('\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((ln, i) => {
        const t = ln.trim()
        if (!t) return null
        if (t.startsWith('##')) return <div key={i} className="label" style={{ marginTop: 8 }}>{t.replace(/^#+\s*/, '')}</div>
        if (/^[-*]\s/.test(t)) return <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--foreground-2)', lineHeight: 1.5 }}><span style={{ color: 'var(--accent)' }}>·</span><span>{t.replace(/^[-*]\s/, '')}</span></div>
        return <div key={i} style={{ fontSize: 13.5, color: 'var(--foreground-2)', lineHeight: 1.55 }}>{t.replace(/\*\*/g, '')}</div>
      })}
    </div>
  )
}

export default async function DailyBriefPage() {
  const [{ morning, evening }, weather, schedule] = await Promise.all([getTodayReviews(), getWeather(), getTodaySchedule()])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      <div className="rise rise-1" style={{ marginBottom: 18 }}>
        <div className="label" style={{ marginBottom: 4 }}>Briefing</div>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Daily Briefing</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '6px 0 0' }}>{dateLong()}</p>
      </div>

      {!morning ? (
        <div className="pcard glow rise rise-2" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No briefing yet today</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>Atlas builds it each morning from your schedule, tasks, clients, and the weather. Generate it now:</div>
          <GenerateBriefButton type="morning" label="Generate briefing" />
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="pcard rise rise-2" style={{ marginBottom: 12 }}>
            <div className="label" style={{ marginBottom: 12 }}>Overview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {weather?.sunrise && <OverviewRow icon={Sunrise} color="#fbbf24" label={`Sunrise ${weather.sunrise}`} />}
              {weather && <OverviewRow icon={CloudSun} color="#60a5fa" label={`${weather.desc}, ${weather.tempNow}°F (${weather.lo}–${weather.hi})`} />}
              <OverviewRow icon={CalendarDays} color="#a78bfa" label={`${schedule.blocks.length} blocks · ${schedule.events.length} event${schedule.events.length === 1 ? '' : 's'}`} />
              {morning.focus && <OverviewRow icon={Target} color="#fb7185" label={`Focus: ${morning.focus}`} />}
            </div>
          </div>

          {/* Top 3 */}
          {Array.isArray(morning.top3) && morning.top3.length > 0 && (
            <div className="pcard rise rise-3" style={{ marginBottom: 12 }}>
              <div className="label" style={{ marginBottom: 12 }}>Top 3 Priorities</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {morning.top3.map((p: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-grad)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.4, paddingTop: 2 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brief body */}
          {morning.body && (
            <div className="pcard rise rise-4" style={{ marginBottom: 12 }}>
              {morning.headline && <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{morning.headline}</div>}
              <Body md={morning.body} />
            </div>
          )}

          {/* Evening review */}
          {evening ? (
            <div className="pcard rise rise-5" style={{ marginBottom: 12, borderColor: 'color-mix(in srgb, var(--accent) 30%, var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Moon size={14} color="var(--accent)" /><span className="label">Evening Review</span>
                {evening.score != null && <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{evening.score}/10</span>}
              </div>
              {evening.headline && <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{evening.headline}</div>}
              {evening.body && <Body md={evening.body} />}
            </div>
          ) : (
            <div className="rise rise-5" style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 12px' }}>
              <GenerateBriefButton type="evening" label="Generate evening review" />
            </div>
          )}

          <Link href="/atlas" className="press rise rise-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px', borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            Ask Atlas anything
          </Link>
        </>
      )}
    </div>
  )
}

function OverviewRow({ icon: Icon, color, label }: { icon: React.ElementType; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <span className="grad-icon" style={{ width: 30, height: 30, background: `${color}1c`, borderRadius: 9, flexShrink: 0 }}><Icon size={15} color={color} /></span>
      <span style={{ fontSize: 13.5, color: 'var(--foreground)' }}>{label}</span>
    </div>
  )
}
