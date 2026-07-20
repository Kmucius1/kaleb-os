import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'

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
    <div className="page-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Raw Captures</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {total ?? 0} total
          {(unprocessed ?? 0) > 0 && (
            <span style={{ color: 'var(--yellow)' }}> · {unprocessed} unprocessed</span>
          )}
          {' '}· last 100 shown
        </span>
      </div>

      {/* Source breakdown */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        {Object.entries(sourceCounts).map(([source, count]) => (
          <div key={source} className="stat-tile" style={{ minWidth: 96 }}>
            <div className="stat-num" style={{ color: 'var(--foreground)' }}>{count}</div>
            <div className="stat-cap" style={{ color: sourceColor(source) }}>{source}</div>
          </div>
        ))}
        {(unprocessed ?? 0) > 0 && (
          <div className="stat-tile" style={{ minWidth: 96 }}>
            <div className="stat-num" style={{ color: 'var(--yellow)' }}>{unprocessed}</div>
            <div className="stat-cap" style={{ color: 'var(--yellow)' }}>Unprocessed</div>
          </div>
        )}
      </div>

      <div className="card2" style={{ padding: 0, overflowX: 'auto' }}>
        {captures.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
            No captures yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: '0.09em', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 130 }}>TIME (ET)</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 70 }}>SOURCE</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 100 }}>TYPE</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 30 }}>✓</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>CONTENT</th>
              </tr>
            </thead>
            <tbody>
              {captures.map((c) => {
                const preview = c.metadata?.subject || c.metadata?.title || c.content_text?.slice(0, 120) || '—'
                const from = c.metadata?.from?.replace(/<.*?>/g, '').trim().slice(0, 40) ?? ''
                return (
                  <tr key={c.id} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                      {formatTime(c.created_at)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ color: sourceColor(c.source), fontWeight: 700, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {c.source}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--foreground-2)', fontSize: 11.5 }}>
                      {c.content_type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 12, color: c.processed_at ? 'var(--green)' : 'var(--muted)' }}>
                        {c.processed_at ? '✓' : '·'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                          {preview}
                        </span>
                        {from && (
                          <span style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {from}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
