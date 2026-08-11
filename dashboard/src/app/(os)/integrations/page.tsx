import { Link2, Mail, Mic, Database, Workflow, Bot, Sparkles, TrendingUp, Cloud } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export const revalidate = 60

type Heartbeat = { at?: string; listed?: number; filed?: number; pending?: number; in_progress?: number; errors?: number; error?: string; waiting_on_plaud?: string[] }

// The PLAUD row reports the real state of the sync instead of a hardcoded
// "active". A recording PLAUD hasn't transcribed can sit unfiled indefinitely —
// that has to be visible here, not buried in a cron log.
function plaudRow(hb: Heartbeat | null) {
  const base = { name: 'PLAUD', icon: Mic }
  if (!hb?.at) return { ...base, status: 'unknown', detail: 'No sync has reported in yet', color: 'var(--muted)' }

  const mins = Math.round((Date.now() - new Date(hb.at).getTime()) / 60000)
  const ago = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`

  if (hb.error) return { ...base, status: 'error', detail: `Sync failing (${ago}): ${hb.error}`, color: 'var(--red)' }
  // Cron is every 30 min — anything past ~90 means it stopped firing.
  if (mins > 90) return { ...base, status: 'stalled', detail: `Last sync ${ago} — cron may have stopped firing`, color: 'var(--red)' }

  const busy = hb.in_progress ?? 0
  if (busy > 0) {
    return { ...base, status: 'filing', detail: `Working through ${busy} long recording${busy > 1 ? 's' : ''} · last sync ${ago}`, color: 'var(--blue)' }
  }

  const waiting = hb.pending ?? 0
  if (waiting > 0) {
    const names = (hb.waiting_on_plaud ?? []).slice(0, 2).join(', ')
    return {
      ...base,
      status: `${waiting} waiting`,
      detail: `${waiting} recording${waiting > 1 ? 's' : ''} uploaded but not transcribed by PLAUD${names ? ` — ${names}` : ''}`,
      color: 'var(--yellow)',
    }
  }
  return { ...base, status: 'active', detail: `Synced ${ago} · ${hb.listed ?? 0} recordings, all filed`, color: 'var(--green)' }
}

export default async function IntegrationsPage() {
  const { data: cfg } = await supabase
    .from('kalebos_config').select('value').eq('key', 'plaud_sync_last').maybeSingle()
  let hb: Heartbeat | null = null
  try { hb = cfg?.value ? JSON.parse(cfg.value) : null } catch { hb = null }

  const integrations = [
    { name: 'Gmail', status: 'active', detail: 'Polling every 15 min via n8n workflow', color: 'var(--blue)', icon: Mail },
    plaudRow(hb),
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
