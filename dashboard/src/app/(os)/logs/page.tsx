import { supabase } from '@/lib/supabase'
import { ScrollText, Zap, Radio } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 30

export default async function LogsPage() {
  const [{ data: actions }, { data: captures }] = await Promise.all([
    supabase.from('agent_actions').select('action_type, description, status, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('raw_captures').select('source, content_type, created_at, processed_at').order('created_at', { ascending: false }).limit(50),
  ])

  const feed = [
    ...(actions ?? []).map(a => ({ time: a.created_at, type: 'action', label: `[ATLAS] ${a.action_type ?? 'action'}: ${a.description?.slice(0, 80) ?? ''}`, status: a.status })),
    ...(captures ?? []).map(c => ({ time: c.created_at, type: 'capture', label: `[CAPTURE] ${c.source}/${c.content_type} received${c.processed_at ? ' · processed' : ' · unprocessed'}`, status: c.processed_at ? 'processed' : 'pending' })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 80)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>System Logs</h1>
          <p style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '6px 0 0' }}>{feed.length} recent entries</p>
        </div>
        <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 13 }}><ScrollText size={19} color="var(--accent)" /></span>
      </div>

      <div className="pcard rise rise-2" style={{ padding: '4px 6px', overflowX: 'auto' }}>
        {feed.map((entry, i) => {
          const isAction = entry.type === 'action'
          const color = isAction ? 'var(--accent)' : 'var(--blue)'
          const Icon = isAction ? Zap : Radio
          return (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderTop: i ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
              <span className="grad-icon" style={{ width: 28, height: 28, background: `color-mix(in srgb, ${color} 15%, transparent)`, borderRadius: 9, flexShrink: 0, boxShadow: 'none' }}><Icon size={14} color={color} /></span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 104 }}>
                {formatTime(entry.time)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--foreground-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
