import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { Inbox, Mail, Mic, FileText, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const revalidate = 60

type Capture = {
  id: string
  source: string
  content_type: string
  content_text: string
  metadata: Record<string, string> | null
  created_at: string
  processed_at: string | null
}

function sourceColor(source: string) {
  const map: Record<string, string> = { gmail: 'var(--blue)', plaud: 'var(--green)' }
  return map[source] ?? 'var(--accent)'
}

function sourceIcon(source: string): LucideIcon {
  const map: Record<string, LucideIcon> = { gmail: Mail, plaud: Mic }
  return map[source] ?? FileText
}

export default async function CapturesPage() {
  const [capturesRes, { count: total }, { count: unprocessed }] = await Promise.all([
    supabase
      .from('raw_captures')
      .select('id, source, content_type, content_text, metadata, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('raw_captures').select('*', { count: 'exact', head: true }),
    supabase.from('raw_captures').select('*', { count: 'exact', head: true }).is('processed_at', null),
  ])

  const captures: Capture[] = capturesRes.data ?? []

  const sourceCounts: Record<string, number> = {}
  for (const c of captures) {
    sourceCounts[c.source] = (sourceCounts[c.source] ?? 0) + 1
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Raw Captures</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><Inbox size={18} color="var(--accent)" /></span>
      </div>
      <p className="rise rise-1" style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '0 0 20px' }}>
        {total ?? 0} total
        {(unprocessed ?? 0) > 0 && <span style={{ color: 'var(--yellow)' }}> · {unprocessed} unprocessed</span>}
        {' '}· last 100 shown
      </p>

      {/* Source breakdown */}
      {(Object.keys(sourceCounts).length > 0 || (unprocessed ?? 0) > 0) && (
        <div className="rise rise-2" style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
          {Object.entries(sourceCounts).map(([source, count]) => (
            <div key={source} className="stat-tile" style={{ flex: '1 1 96px', minWidth: 96 }}>
              <div className="stat-num" style={{ color: 'var(--foreground)' }}>{count}</div>
              <div className="stat-cap" style={{ color: sourceColor(source) }}>{source}</div>
            </div>
          ))}
          {(unprocessed ?? 0) > 0 && (
            <div className="stat-tile" style={{ flex: '1 1 96px', minWidth: 96 }}>
              <div className="stat-num" style={{ color: 'var(--yellow)' }}>{unprocessed}</div>
              <div className="stat-cap" style={{ color: 'var(--yellow)' }}>Unprocessed</div>
            </div>
          )}
        </div>
      )}

      {captures.length === 0 ? (
        <div className="pcard rise rise-3" style={{ color: 'var(--muted)', fontSize: 13, padding: '48px 20px', textAlign: 'center' }}>
          No captures yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {captures.map((c, i) => {
            const color = sourceColor(c.source)
            const Icon = sourceIcon(c.source)
            const preview = c.metadata?.subject || c.metadata?.title || c.content_text?.slice(0, 140) || '—'
            const from = c.metadata?.from?.replace(/<.*?>/g, '').trim().slice(0, 40) ?? ''
            return (
              <div key={c.id} className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 15px' }}>
                <span className="grad-icon" style={{ width: 40, height: 40, background: `${color}1c`, borderRadius: 12, flexShrink: 0 }}><Icon size={19} color={color} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="pillar-tag" style={{ color, background: `${color}1f` }}>{c.source}</span>
                    <span style={{ fontSize: 11, color: 'var(--foreground-2)' }}>{c.content_type.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{formatTime(c.created_at)}</span>
                    {c.processed_at && <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={11} color="var(--green)" /></span>}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {preview}
                  </div>
                  {from && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{from}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
