import { Settings } from 'lucide-react'

export default function SettingsPage() {
  const settings = [
    { section: 'HERMES', items: [
      { label: 'Agent Model', value: 'google/gemini-flash-2.0 (via OpenRouter)', editable: false },
      { label: 'Agent Version', value: 'v0.12.0', editable: false },
      { label: 'VPS', value: '178.156.185.104 · Hetzner CPX11 · Ashburn', editable: false },
    ]},
    { section: 'NOTIFICATIONS', items: [
      { label: 'Quiet Hours', value: '7am – 9pm ET', editable: true },
      { label: 'Email Approval Rule', value: 'ALL emails require explicit Telegram approval', editable: false },
    ]},
    { section: 'MEMORY', items: [
      { label: 'Memory TTL', value: '60 days (+ 30 on reference)', editable: false },
    ]},
    { section: 'INTEGRATIONS', items: [
      { label: 'Supabase Project', value: 'KalebOS · eafrjiqjelumqgoefbfd', editable: false },
      { label: 'n8n', value: 'n8n.kalebos.app · 2 workflows active', editable: false },
      { label: 'Telegram Bot', value: '@kaleb_hermes_bot', editable: false },
    ]},
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Settings size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>SETTINGS</span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', borderRadius: 6, padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#f59e0b', marginBottom: 4 }}>⚠ Settings are managed via Hermes config files on the VPS.</div>
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>To change settings, SSH into 178.156.185.104 and edit ~/.hermes/config.yaml or tell Hermes via Telegram.</div>
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
