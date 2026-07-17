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
    <div className="page-pad" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Settings size={18} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.01em' }}>Settings</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <NotificationsToggle />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 4 }}>Settings are managed by Atlas, your in-app assistant.</div>
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>To change a setting, just ask Atlas in the app (e.g. &ldquo;update my quiet hours to 8am–10pm&rdquo;), or edit it here in the dashboard.</div>
      </div>

      {settings.map(group => (
        <div key={group.section} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 10 }}>{group.section}</div>
          {group.items.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--foreground-2)' }}>{item.label}</span>
              <span style={{ fontSize: 11, color: 'var(--foreground)', fontWeight: 500 }}>{item.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
