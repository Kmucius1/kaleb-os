import { supabase } from '@/lib/supabase'
import { ScrollText } from 'lucide-react'
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
    <div className="page-pad" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <ScrollText size={20} color="var(--accent)" />
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>System Logs</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{feed.length} recent entries</span>
      </div>

      <div className="card2" style={{ padding: '4px 0', overflowX: 'auto' }}>
        {feed.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 16px', borderTop: i ? '1px solid var(--border)' : 'none', alignItems: 'baseline' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 110 }}>
              {formatTime(entry.time)}
            </span>
            <span className="pillar-tag" style={{
              color: entry.type === 'action' ? 'var(--accent)' : 'var(--blue)',
              background: entry.type === 'action' ? 'var(--accent-dim)' : 'var(--blue-dim)',
              flexShrink: 0, minWidth: 66, textAlign: 'center',
            }}>
              {entry.type.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--foreground-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
