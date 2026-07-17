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
  const map: Record<string, string> = { gmail: '#4285f4', plaud: '#00c853' }
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
    <div style={{ padding: '20px 28px', maxWidth: 1400 }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
          RAW CAPTURES
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 10 }}>
          {total ?? 0} total
          {(unprocessed ?? 0) > 0 && (
            <span style={{ color: '#f59e0b' }}> · {unprocessed} unprocessed</span>
          )}
          {' '}· last 100 shown · revalidates 60s
        </div>
      </div>

      {/* Source breakdown */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {Object.entries(sourceCounts).map(([source, count]) => (
          <div key={source} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${sourceColor(source)}`,
            padding: '10px 14px',
            minWidth: 90,
          }}>
            <div style={{ fontSize: 9, color: sourceColor(source), fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
              {source.toUpperCase()}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>
              {count}
            </div>
          </div>
        ))}
        {(unprocessed ?? 0) > 0 && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid #f59e0b',
            padding: '10px 14px',
            minWidth: 90,
          }}>
            <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
              UNPROCESSED
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>
              {unprocessed}
            </div>
          </div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
            <th style={{ paddingBottom: 8, fontWeight: 400, width: 130 }}>TIME (ET)</th>
            <th style={{ paddingBottom: 8, fontWeight: 400, width: 70 }}>SOURCE</th>
            <th style={{ paddingBottom: 8, fontWeight: 400, width: 100 }}>TYPE</th>
            <th style={{ paddingBottom: 8, fontWeight: 400, width: 30 }}>✓</th>
            <th style={{ paddingBottom: 8, fontWeight: 400 }}>CONTENT</th>
          </tr>
        </thead>
        <tbody>
          {captures.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>
                — no captures yet —
              </td>
            </tr>
          ) : (
            captures.map((c, i) => {
              const preview = c.metadata?.subject || c.metadata?.title || c.content_text?.slice(0, 120) || '—'
              const from = c.metadata?.from?.replace(/<.*?>/g, '').trim().slice(0, 40) ?? ''
              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #161616',
                    background: i % 2 === 1 ? 'var(--surface)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px 16px 8px 0', color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {formatTime(c.created_at)}
                  </td>
                  <td style={{ padding: '8px 16px 8px 0' }}>
                    <span style={{
                      color: sourceColor(c.source),
                      fontWeight: 700,
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      {c.source}
                    </span>
                  </td>
                  <td style={{ padding: '8px 16px 8px 0', color: 'var(--muted)', fontSize: 11 }}>
                    {c.content_type.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '8px 16px 8px 0' }}>
                    <span style={{ fontSize: 11, color: c.processed_at ? 'var(--green)' : '#333' }}>
                      {c.processed_at ? '✓' : '·'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 0', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                      <span style={{
                        fontSize: 12,
                        color: 'var(--foreground)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 500,
                      }}>
                        {preview}
                      </span>
                      {from && (
                        <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {from}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
