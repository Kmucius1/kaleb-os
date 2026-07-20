import { Link2, Mail, Mic, Database, Workflow, Bot, Sparkles, TrendingUp, Cloud } from 'lucide-react'

export default function IntegrationsPage() {
  const integrations = [
    { name: 'Gmail', status: 'active', detail: 'Polling every 15 min via n8n workflow', color: 'var(--blue)', icon: Mail },
    { name: 'PLAUD', status: 'active', detail: 'Webhook at n8n.kalebos.app/webhook/plaud-capture', color: 'var(--green)', icon: Mic },
    { name: 'Supabase', status: 'active', detail: 'MCP connection · project eafrjiqjelumqgoefbfd', color: 'var(--green)', icon: Database },
    { name: 'n8n', status: 'active', detail: 'Self-hosted at n8n.kalebos.app · 2 workflows active', color: 'var(--yellow)', icon: Workflow },
    { name: 'Atlas', status: 'active', detail: 'In-app AI assistant', color: 'var(--accent)', icon: Bot },
    { name: 'OpenRouter', status: 'active', detail: 'Model: google/gemini-flash-2.0 · lean usage', color: 'var(--accent)', icon: Sparkles },
    { name: 'TradePrint', status: 'pending', detail: 'Phase 3 remaining — webhook not yet configured', color: 'var(--muted)', icon: TrendingUp },
    { name: 'Cloudflare Tunnel', status: 'active', detail: 'kalebos.app domain · tunnel active', color: 'var(--yellow)', icon: Cloud },
  ]
  const active = integrations.filter(i => i.status === 'active').length

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Integrations</h1>
          <p style={{ color: 'var(--green)', fontSize: 13, margin: '6px 0 0', fontWeight: 500 }}>{active} active</p>
        </div>
        <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 13 }}><Link2 size={19} color="var(--accent)" /></span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {integrations.map((intg, i) => {
          const on = intg.status === 'active'
          const Icon = intg.icon
          return (
            <div key={intg.name} className={`pcard press rise rise-${Math.min(7, i + 1)}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px' }}>
              <span className="grad-icon" style={{ width: 40, height: 40, background: `color-mix(in srgb, ${intg.color} 16%, transparent)`, borderRadius: 12, flexShrink: 0 }}>
                <Icon size={19} color={intg.color} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>{intg.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{intg.detail}</div>
              </div>
              <span className="pillar-tag" style={{
                color: on ? 'var(--green)' : 'var(--muted)',
                background: on ? 'var(--green-dim)' : 'var(--surface-3)',
                flexShrink: 0,
              }}>
                {intg.status.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
