'use client'
import { useState } from 'react'
import { Mail, Mic, MessageCircle, ArrowRight } from 'lucide-react'

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
}

type AgentAction = {
  id: string
  action_type: string | null
  description: string
  status: string
  created_at: string
}

type Recommendation = {
  id: string
  title: string
  description: string
  priority: string | null
  status: string | null
  created_at: string
}

const PRIORITIES = [
  'Business Profit',
  'Trading Profit',
  'Agency Growth',
  'Personal Brand',
  'Personal Optimization',
  'Relationships',
]

function sourceIcon(source?: string) {
  if (!source) return <Mail size={12} color="#4285f4" />
  if (source === 'plaud') return <Mic size={12} color="#22c55e" />
  if (source === 'telegram') return <MessageCircle size={12} color="#3b82f6" />
  return <Mail size={12} color="#4285f4" />
}

function priorityBadge(rank: number) {
  const colors = ['var(--accent)', 'var(--accent)', '#f59e0b', '#f59e0b', 'var(--muted)', 'var(--muted)']
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      color: colors[rank - 1] ?? 'var(--muted)',
      border: `1px solid ${colors[rank - 1] ?? 'var(--muted)'}`,
      padding: '1px 5px',
      borderRadius: 3,
      letterSpacing: '0.04em',
    }}>
      P{rank}
    </span>
  )
}

export default function ActionQueueTabs({
  tasks,
  approvals,
  recommendations,
}: {
  tasks: Task[]
  approvals: AgentAction[]
  recommendations: Recommendation[]
}) {
  const [tab, setTab] = useState<'action' | 'approval' | 'review'>('action')

  const pending = tasks.filter(t => t.status === 'pending')
  const tabData = {
    action: { count: pending.length, label: 'NEEDS ACTION' },
    approval: { count: approvals.length, label: 'NEEDS APPROVAL' },
    review: { count: recommendations.length, label: 'NEEDS REVIEW' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        {(['action', 'approval', 'review'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--foreground)' : 'var(--muted)',
              padding: '0 14px 8px',
              fontSize: 10,
              fontWeight: tab === t ? 700 : 400,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: -1,
            }}
          >
            {tabData[t].label}
            {tabData[t].count > 0 && (
              <span style={{
                background: tab === t ? 'var(--accent)' : 'var(--surface-2)',
                color: tab === t ? '#fff' : 'var(--muted)',
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 10,
              }}>
                {tabData[t].count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'action' && (
        <div style={{ flex: 1 }}>
          {pending.length === 0 ? (
            <Empty text="No pending tasks" />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 28px 1fr 110px 90px', gap: 6, padding: '4px 0 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                {['PRIORITY', 'SRC', 'TITLE / CONTEXT', 'RELATED TO', 'STATUS'].map(h => (
                  <div key={h} style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', fontWeight: 700 }}>{h}</div>
                ))}
              </div>
              {pending.slice(0, 6).map((t, i) => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '40px 28px 1fr 110px 90px', gap: 6, padding: '8px 0', borderBottom: '1px solid #161616', alignItems: 'center' }}>
                  <div>{priorityBadge(Math.min(i + 1, 3))}</div>
                  <div>{sourceIcon()}</div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    {t.description && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{t.description}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {PRIORITIES[Math.min(i, 5)]}
                  </div>
                  <div>
                    <span style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.06em' }}>Your action</span>
                  </div>
                </div>
              ))}
              {pending.length > 6 && (
                <div style={{ paddingTop: 10 }}>
                  <a href="/tasks" style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    View all tasks <ArrowRight size={10} />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'approval' && (
        <div style={{ flex: 1 }}>
          {approvals.length === 0 ? (
            <Empty text="No pending approvals" />
          ) : (
            approvals.slice(0, 6).map(a => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #161616' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em' }}>
                    {a.action_type?.toUpperCase() ?? 'ACTION'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.description}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>Approve in the app</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'review' && (
        <div style={{ flex: 1 }}>
          {recommendations.length === 0 ? (
            <Empty text="No items need review" />
          ) : (
            recommendations.slice(0, 6).map(r => (
              <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid #161616' }}>
                <div style={{ fontSize: 11, color: 'var(--foreground)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.description}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'action' && pending.length > 0 && pending.length <= 6 && (
        <div style={{ paddingTop: 10 }}>
          <a href="/tasks" style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all tasks <ArrowRight size={10} />
          </a>
        </div>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ color: 'var(--muted)', fontSize: 11, padding: '24px 0', textAlign: 'center' }}>
      — {text} —
    </div>
  )
}
