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
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <ScrollText size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>SYSTEM LOGS</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{feed.length} recent entries · revalidates 30s</span>
      </div>

      <div style={{ fontFamily: 'inherit' }}>
        {feed.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid #111', alignItems: 'baseline' }}>
            <span style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 110 }}>
              {formatTime(entry.time)}
            </span>
            <span style={{ fontSize: 11, color: entry.type === 'action' ? 'var(--accent)' : '#4285f4', whiteSpace: 'nowrap', minWidth: 70 }}>
              [{entry.type.toUpperCase()}]
            </span>
            <span style={{ fontSize: 11, color: 'var(--foreground-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
