import { Settings, Bot, Bell, Database, Link2, Sparkles } from 'lucide-react'
import NotificationsToggle from '@/components/NotificationsToggle'

const SECTION_META: Record<string, { icon: typeof Settings; color: string }> = {
  ATLAS: { icon: Bot, color: 'var(--accent)' },
  NOTIFICATIONS: { icon: Bell, color: 'var(--money)' },
  MEMORY: { icon: Database, color: 'var(--blue)' },
  INTEGRATIONS: { icon: Link2, color: 'var(--green)' },
}

export default function SettingsPage() {
  const settings = [
    { section: 'ATLAS', items: [
      { label: 'Assistant', value: 'Atlas · in-app AI assistant', editable: false },
      { label: 'Model', value: 'Claude (Anthropic)', editable: false },
    ]},
    { section: 'NOTIFICATIONS', items: [
      { label: 'Quiet Hours', value: '7am – 9pm ET', editable: true },
      { label: 'Email Approval Rule', value: 'ALL emails require explicit in-app approval', editable: false },
    ]},
    { section: 'MEMORY', items: [
      { label: 'Memory TTL', value: '60 days (+ 30 on reference)', editable: false },
    ]},
    { section: 'INTEGRATIONS', items: [
      { label: 'Supabase Project', value: 'KalebOS · eafrjiqjelumqgoefbfd', editable: false },
      { label: 'Assistant', value: 'Atlas (in-app)', editable: false },
      { label: 'Voice Capture', value: 'PLAUD', editable: false },
    ]},
  ]

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Settings</h1>
          <p style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '6px 0 0' }}>Tuned by Atlas · edited here.</p>
        </div>
        <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 13 }}><Settings size={19} color="var(--accent)" /></span>
      </div>

      {/* Notifications toggle — client component, unchanged */}
      <div className="rise rise-2" style={{ marginBottom: 14 }}>
        <NotificationsToggle />
      </div>

      {/* Atlas-managed note */}
      <div className="pcard rise rise-2" style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 26 }}>
        <span className="grad-icon" style={{ width: 34, height: 34, background: 'var(--accent-dim)', borderRadius: 11, flexShrink: 0 }}><Sparkles size={17} color="var(--accent)" /></span>
        <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Settings are managed by Atlas</span>, your in-app assistant. To change one, just ask (e.g. &ldquo;update my quiet hours to 8am–10pm&rdquo;), or edit it here in the dashboard.
        </div>
      </div>

      {settings.map((group, gi) => {
        const meta = SECTION_META[group.section] ?? { icon: Settings, color: 'var(--muted)' }
        const Icon = meta.icon
        return (
          <div key={group.section} className={`rise rise-${Math.min(7, gi + 3)}`} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 10px' }}>
              <Icon size={13} color={meta.color} />
              <span className="label">{group.section}</span>
            </div>
            <div className="pcard" style={{ padding: '4px 8px' }}>
              {group.items.map((item, idx) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '13px 10px', borderTop: idx ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 13, color: 'var(--foreground-2)' }}>{item.label}</span>
                    {item.editable && <span className="pillar-tag" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}>Editable</span>}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500, textAlign: 'right' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
