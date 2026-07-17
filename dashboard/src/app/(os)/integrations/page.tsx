import { Link2, CheckCircle, Circle } from 'lucide-react'

export default function IntegrationsPage() {
  const integrations = [
    { name: 'Gmail', status: 'active', detail: 'Polling every 15 min via n8n workflow', color: '#4285f4' },
    { name: 'PLAUD', status: 'active', detail: 'Webhook at n8n.kalebos.app/webhook/plaud-capture', color: '#22c55e' },
    { name: 'Supabase', status: 'active', detail: 'MCP connection · project eafrjiqjelumqgoefbfd', color: '#3b82f6' },
    { name: 'n8n', status: 'active', detail: 'Self-hosted at n8n.kalebos.app · 2 workflows active', color: '#f59e0b' },
    { name: 'Atlas', status: 'active', detail: 'In-app AI assistant', color: '#3b82f6' },
    { name: 'OpenRouter', status: 'active', detail: 'Model: google/gemini-flash-2.0 · lean usage', color: '#8b5cf6' },
    { name: 'TradePrint', status: 'pending', detail: 'Phase 3 remaining — webhook not yet configured', color: 'var(--muted)' },
    { name: 'Cloudflare Tunnel', status: 'active', detail: 'kalebos.app domain · tunnel active', color: '#f59e0b' },
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Link2 size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>INTEGRATIONS</span>
        <span style={{ color: '#22c55e', fontSize: 11 }}>{integrations.filter(i => i.status === 'active').length} active</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {integrations.map(intg => (
          <div key={intg.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flexShrink: 0 }}>
              {intg.status === 'active'
                ? <CheckCircle size={16} color="#22c55e" />
                : <Circle size={16} color="var(--muted)" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: intg.color, marginBottom: 3 }}>{intg.name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{intg.detail}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: intg.status === 'active' ? '#22c55e' : 'var(--muted)', border: `1px solid ${intg.status === 'active' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>
              {intg.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
