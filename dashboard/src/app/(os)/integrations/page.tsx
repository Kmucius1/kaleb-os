import { Link2, CheckCircle, Circle } from 'lucide-react'

export default function IntegrationsPage() {
  const integrations = [
    { name: 'Gmail', status: 'active', detail: 'Polling every 15 min via n8n workflow', color: 'var(--blue)' },
    { name: 'PLAUD', status: 'active', detail: 'Webhook at n8n.kalebos.app/webhook/plaud-capture', color: 'var(--green)' },
    { name: 'Supabase', status: 'active', detail: 'MCP connection · project eafrjiqjelumqgoefbfd', color: 'var(--green)' },
    { name: 'n8n', status: 'active', detail: 'Self-hosted at n8n.kalebos.app · 2 workflows active', color: 'var(--yellow)' },
    { name: 'Atlas', status: 'active', detail: 'In-app AI assistant', color: 'var(--accent)' },
    { name: 'OpenRouter', status: 'active', detail: 'Model: google/gemini-flash-2.0 · lean usage', color: 'var(--accent)' },
    { name: 'TradePrint', status: 'pending', detail: 'Phase 3 remaining — webhook not yet configured', color: 'var(--muted)' },
    { name: 'Cloudflare Tunnel', status: 'active', detail: 'kalebos.app domain · tunnel active', color: 'var(--yellow)' },
  ]

  return (
    <div className="page-pad" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <Link2 size={20} color="var(--accent)" />
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Integrations</h1>
        <span style={{ color: 'var(--green)', fontSize: 12 }}>{integrations.filter(i => i.status === 'active').length} active</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {integrations.map(intg => (
          <div key={intg.name} className="list-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flexShrink: 0 }}>
              {intg.status === 'active'
                ? <CheckCircle size={17} color="var(--green)" />
                : <Circle size={17} color="var(--muted)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: intg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' }}>{intg.name}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{intg.detail}</div>
            </div>
            <span className="pillar-tag" style={{
              color: intg.status === 'active' ? 'var(--green)' : 'var(--muted)',
              background: intg.status === 'active' ? 'var(--green-dim)' : 'var(--surface-3)',
              flexShrink: 0,
            }}>
              {intg.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
