'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ChevronDown, Undo2, Mic } from 'lucide-react'
import { bucketOf, NOW_LIMIT, type Bucket } from '@/lib/tasks'

// The task list, filtered down to a list a person can actually act on.
//
// The old page rendered every pending row in one flat column ordered by
// created_at. At 306 rows that is not a task list, it's a transcript. This shows
// one bucket at a time and defaults to Now — his own work, scored 7+ or due —
// which is usually a handful of rows. The rest stay one tap away rather than in
// the way.

export type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: number | null
  owner: string | null
  area: string | null
  source: string | null
  due_date: string | null
  triaged_at: string | null
  created_at: string
}

const TABS: { key: Bucket; label: string; blurb: string }[] = [
  { key: 'now', label: 'Now', blurb: 'Yours, and it matters this week.' },
  { key: 'soon', label: 'Soon', blurb: 'Yours. Real work, nothing breaks if it waits.' },
  { key: 'someday', label: 'Someday', blurb: 'Yours, but low stakes. Skim it monthly.' },
  { key: 'notmine', label: 'Not mine', blurb: "Overheard in a meeting — someone else's action item, kept for reference." },
]

const BUCKET_COLOR: Record<Bucket, string> = {
  now: 'var(--accent)',
  soon: 'var(--blue)',
  someday: 'var(--muted)',
  notmine: 'var(--muted)',
  untriaged: 'var(--yellow)',
}

const AREA_COLOR: Record<string, string> = {
  dryp: 'var(--accent-2)', ehm: 'var(--money)', linkdup: 'var(--relationships)',
  'kaleb-os': 'var(--mind)', trading: 'var(--green)', commerce: 'var(--cyan)',
  clients: 'var(--mission)', personal: 'var(--body)', admin: 'var(--muted)',
}

export default function TaskBoard({ tasks }: { tasks: Task[] }) {
  const router = useRouter()
  const [, start] = useTransition()
  const [tab, setTab] = useState<Bucket>('now')
  const [gone, setGone] = useState<Record<string, 'completed' | 'dismissed'>>({})
  const [showDone, setShowDone] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const buckets = useMemo(() => {
    const b: Record<Bucket, Task[]> = { now: [], soon: [], someday: [], notmine: [], untriaged: [] }
    for (const t of tasks) b[bucketOf(t)].push(t)
    for (const k of Object.keys(b) as Bucket[]) {
      b[k].sort((x, y) => (y.priority ?? 5) - (x.priority ?? 5) || (x.due_date ?? 'z').localeCompare(y.due_date ?? 'z'))
    }
    return b
  }, [tasks])

  // Anything triaged away this session stays visible, struck through, until the
  // next load — undoing a misfire shouldn't require finding the row again.
  const visible = buckets[tab]
  const active = visible.filter(t => !gone[t.id])
  const cleared = visible.filter(t => gone[t.id])

  function mark(id: string, status: 'completed' | 'dismissed' | null) {
    setGone(g => {
      const next = { ...g }
      if (status) next[id] = status
      else delete next[id]
      return next
    })
    fetch('/api/tasks/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: status ?? 'pending' }),
    }).then(() => start(() => router.refresh()))
  }

  const untriaged = buckets.untriaged.length

  return (
    <>
      <div className="seg rise rise-2" style={{ marginBottom: 6 }}>
        {TABS.map(t => (
          <div key={t.key} className={`seg-item${tab === t.key ? ' active' : ''}`} onClick={() => { setTab(t.key); setShowAll(false) }}>
            {t.label}
            <span style={{ marginLeft: 5, fontSize: 11, color: tab === t.key ? BUCKET_COLOR[t.key] : 'var(--muted)', fontWeight: 700 }}>
              {buckets[t.key].length}
            </span>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.5, margin: '0 4px 16px' }}>
        {TABS.find(t => t.key === tab)?.blurb}
      </p>

      {untriaged > 0 && (
        <div className="card2 rise rise-3" style={{ marginBottom: 14, borderColor: 'var(--yellow)', display: 'flex', gap: 11, alignItems: 'center' }}>
          <span className="grad-icon" style={{ width: 34, height: 34, background: 'var(--yellow-dim)', borderRadius: 11, flexShrink: 0 }}>
            <ChevronDown size={17} color="var(--yellow)" />
          </span>
          <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--foreground)' }}>{untriaged} untriaged</strong> — filed before triage existed, so
            they have no owner or priority. Run <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>npm run triage</code> to sort them.
          </div>
        </div>
      )}

      {active.length === 0 && cleared.length === 0 ? (
        <div className="pcard rise rise-3" style={{ textAlign: 'center', padding: '44px 24px' }}>
          <div style={{ color: 'var(--foreground-2)', fontSize: 14 }}>
            {tab === 'now' ? 'Nothing urgent that’s yours.' : 'Empty.'}
          </div>
          {tab === 'now' && buckets.soon.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              {buckets.soon.length} in Soon when you want more.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(showAll ? active : active.slice(0, NOW_LIMIT)).map((t, i) => <Row key={t.id} t={t} i={i} onMark={mark} />)}
          {!showAll && active.length > NOW_LIMIT && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                background: 'transparent', border: '1px dashed var(--border-2)', borderRadius: 14,
                padding: '12px', color: 'var(--foreground-2)', fontSize: 12.5, cursor: 'pointer', marginTop: 2,
              }}
            >
              {active.length - NOW_LIMIT} more in {TABS.find(t => t.key === tab)?.label} — show all
            </button>
          )}
        </div>
      )}

      {cleared.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="label" style={{ margin: '0 4px 10px', cursor: 'pointer' }} onClick={() => setShowDone(s => !s)}>
            Cleared this session ({cleared.length})
          </div>
          {showDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cleared.map(t => (
                <div key={t.id} className="pcard" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', opacity: 0.5 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                  <button onClick={() => mark(t.id, null)} style={btn('var(--muted)')} aria-label="Undo"><Undo2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function Row({ t, i, onMark }: { t: Task; i: number; onMark: (id: string, s: 'completed' | 'dismissed') => void }) {
  const b = bucketOf(t)
  const color = BUCKET_COLOR[b]
  const overdue = !!t.due_date && t.due_date <= new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())

  return (
    <div className={`pcard press rise rise-${Math.min(7, (i % 7) + 1)}`} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px 12px 14px', position: 'relative', overflow: 'hidden',
    }}>
      <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: overdue ? 'var(--red)' : color }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--foreground)', lineHeight: 1.35 }}>
          {t.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
          <span className="pillar-tag" style={{ color, background: 'transparent', border: `1px solid ${color}`, padding: '1px 5px' }}>
            P{t.priority ?? '?'}
          </span>
          {t.area && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: AREA_COLOR[t.area] ?? 'var(--muted)' }}>
              {t.area}
            </span>
          )}
          {t.owner === 'team' && <span style={{ fontSize: 10, color: 'var(--muted)' }}>delegate</span>}
          {t.due_date && (
            <span style={{ fontSize: 10, color: overdue ? 'var(--red)' : 'var(--muted)', fontWeight: overdue ? 700 : 400 }}>
              {overdue ? 'due ' : ''}{t.due_date.slice(5)}
            </span>
          )}
          {t.source && (
            <span style={{ fontSize: 10, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
              <Mic size={9} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{t.source}</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onMark(t.id, 'dismissed')} style={btn('var(--muted)')} aria-label="Dismiss"><X size={16} /></button>
        <button onClick={() => onMark(t.id, 'completed')} style={btn('var(--green)')} aria-label="Complete"><Check size={16} /></button>
      </div>
    </div>
  )
}

function btn(color: string): React.CSSProperties {
  return {
    width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--surface-2)', border: '1px solid var(--border)', color, cursor: 'pointer', flexShrink: 0,
  }
}
