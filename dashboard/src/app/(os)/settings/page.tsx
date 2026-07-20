import { Settings } from 'lucide-react'
import NotificationsToggle from '@/components/NotificationsToggle'

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
    <div className="page-pad" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <Settings size={20} color="var(--accent)" />
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Settings</h1>
      </div>

      <div style={{ marginBottom: 20 }}>
        <NotificationsToggle />
      </div>

      <div className="card2" style={{ borderLeft: '3px solid var(--accent)', padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Settings are managed by Atlas</span>, your in-app assistant. To change one, just ask (e.g. &ldquo;update my quiet hours to 8am–10pm&rdquo;), or edit it here in the dashboard.
        </div>
      </div>

      {settings.map(group => (
        <div key={group.section} style={{ marginBottom: 22 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>{group.section}</div>
          <div className="card2" style={{ padding: 0, overflow: 'hidden' }}>
            {group.items.map((item, idx) => (
              <div key={item.label} className="list-row" style={{ justifyContent: 'space-between', borderTop: idx ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--foreground-2)' }}>{item.label}</span>
                <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500, textAlign: 'right' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
