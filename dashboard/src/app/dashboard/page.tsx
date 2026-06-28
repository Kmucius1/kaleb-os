import { supabase } from '@/lib/supabase'
import { supabaseDryp } from '@/lib/supabaseDryp'
import { getRevenueSnapshot, type RevenueSnapshot } from '@/lib/ledger'
import JournalBox from '@/components/JournalBox'
import Link from 'next/link'
import {
  Sunrise, CheckCircle2, Circle, Brain, TrendingUp, Clapperboard,
  Users, DollarSign, ArrowUpRight, ExternalLink, UserPlus, ListChecks,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const money = (n: number) => '$' + Math.round(n).toLocaleString()
const BRAND_DOT: Record<string, string> = { me: '#34d399', ai: '#a78bfa', trading: '#fbbf24' }

export default async function Dashboard() {
  const now = new Date()
  const etHour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(now))
  const greeting = etHour < 12 ? 'Good morning' : etHour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }).format(now)
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now) // YYYY-MM-DD

  // ── KalebOS data ──
  const [{ data: brands }, { data: ideas }, { count: scriptCount }, { data: journalToday }] = await Promise.all([
    supabase.from('brands').select('id,slug,name,color'),
    supabase.from('content_ideas').select('id,brand_id,title,angle,platform,status').in('status', ['idea', 'approved']).order('created_at', { ascending: false }).limit(8),
    supabase.from('content_scripts').select('id', { count: 'exact', head: true }).in('status', ['draft', 'final']),
    supabase.from('journal').select('id').eq('entry_date', todayStr).limit(1),
  ])
  const brandById = new Map((brands ?? []).map(b => [b.id, b]))
  const journaledToday = (journalToday ?? []).length > 0

  let tasks: { title: string }[] = []
  try {
    const { data } = await supabase.from('tasks').select('title,status').in('status', ['pending', 'in_progress']).limit(5)
    tasks = data ?? []
  } catch { /* tasks table optional */ }

  // ── DRYP CRM ──
  let activeClients = 0, clientNames: string[] = [], newLeads = 0, recentLeads: { business_name: string }[] = []
  try {
    const [{ data: accts }, { data: leads }] = await Promise.all([
      supabaseDryp.from('accounts').select('business_name,is_active'),
      supabaseDryp.from('leads').select('business_name,stage,created_at').order('created_at', { ascending: false }),
    ])
    const active = (accts ?? []).filter(a => a.is_active)
    activeClients = active.length
    clientNames = active.map(a => (a.business_name as string).trim()).slice(0, 4)
    const open = (leads ?? []).filter(l => !['won', 'lost', 'completed'].includes(l.stage as string))
    const brandNew = open.filter(l => l.stage === 'not_started')
    newLeads = brandNew.length
    recentLeads = (brandNew.length ? brandNew : open).slice(0, 3)
  } catch { /* CRM optional */ }

  // ── DRYP Ledger ──
  let rev: RevenueSnapshot | null = null
  try { rev = await getRevenueSnapshot() } catch { /* ledger optional */ }

  const ideasReady = (ideas ?? []).length

  // ── derive Today's action items ──
  const items: { label: string; done?: boolean; href?: string; icon: React.ElementType; accent?: string }[] = [
    { label: journaledToday ? 'Meditate & journal — done' : 'Meditate & journal', done: journaledToday, icon: Brain, accent: '#a78bfa' },
    { label: 'Trade — pre-market check & plan', icon: TrendingUp, href: '/trading', accent: '#fbbf24' },
  ]
  if (ideasReady) items.push({ label: `Post content — ${ideasReady} idea${ideasReady > 1 ? 's' : ''} ready`, href: '/content', icon: Clapperboard, accent: '#34d399' })
  if (newLeads) items.push({ label: `Respond to ${newLeads} new lead${newLeads > 1 ? 's' : ''}`, href: '/business', icon: UserPlus, accent: '#60a5fa' })
  if (activeClients) items.push({ label: `Check in with clients — ${activeClients} active`, href: '/business', icon: Users, accent: '#22d3ee' })
  for (const t of tasks) items.push({ label: t.title, icon: ListChecks })

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1180, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Sunrise size={22} color="var(--accent)" />
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{greeting}, Kaleb</h1>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>{dateStr} · here&apos;s what matters today.</div>

      {/* Row 1: Today + Rituals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="TODAY" accent="var(--accent)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map((it, i) => {
              const Inner = (
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 6px', borderRadius: 8 }}>
                  {it.done ? <CheckCircle2 size={17} color="var(--green)" /> : <Circle size={17} color={it.accent ?? 'var(--muted)'} />}
                  <span style={{ flex: 1, fontSize: 14, color: it.done ? 'var(--muted)' : 'var(--foreground)', textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</span>
                  {it.href && <ArrowUpRight size={14} color="var(--muted)" />}
                </div>
              )
              return it.href
                ? <Link key={i} href={it.href} style={{ textDecoration: 'none' }} className="row-hover">{Inner}</Link>
                : <div key={i}>{Inner}</div>
            })}
          </div>
        </Card>

        <Card title="RITUALS" accent="#a78bfa">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Brain size={15} color="#a78bfa" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Meditation & journal</span>
          </div>
          <JournalBox doneToday={journaledToday} />
        </Card>
      </div>

      {/* Row 2: Content / Clients / Revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* Content */}
        <Card title="CONTENT READY" accent="#34d399" href="/content">
          {ideasReady === 0 && <Empty>No ideas queued — generate some.</Empty>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(ideas ?? []).slice(0, 4).map(i => {
              const b = brandById.get(i.brand_id)
              return (
                <div key={i.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: BRAND_DOT[b?.slug ?? ''] ?? 'var(--muted)', marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.4 }}>{i.angle || i.title}</span>
                </div>
              )
            })}
          </div>
          {typeof scriptCount === 'number' && scriptCount > 0 && (
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--muted)' }}>+ {scriptCount} script{scriptCount > 1 ? 's' : ''} drafted</div>
          )}
        </Card>

        {/* Clients */}
        <Card title="CLIENTS" accent="#22d3ee" href="/business">
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <Stat value={String(activeClients)} label="ACTIVE" />
            <Stat value={String(newLeads)} label="NEW LEADS" accent={newLeads ? 'var(--accent)' : undefined} />
          </div>
          {clientNames.length > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.6 }}>
              {clientNames.join(' · ')}{activeClients > clientNames.length ? ' …' : ''}
            </div>
          )}
          {recentLeads.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--accent)' }}>
              New: {recentLeads.map(l => l.business_name).join(', ')}
            </div>
          )}
        </Card>

        {/* Revenue */}
        <Card title="REVENUE · CFO" accent="#34d399" href="/business">
          {!rev && <Empty>Ledger not connected.</Empty>}
          {rev && (
            <>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>{money(rev.cashIn)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>CASH RECEIVED · ALL-TIME</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <Stat value={money(rev.thisMonth)} label="THIS MONTH" accent="var(--green)" />
                <Stat value={money(rev.outstanding)} label="OUTSTANDING" accent={rev.outstanding ? 'var(--yellow)' : undefined} />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Shortcuts */}
      <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Shortcut href="https://www.dryphub.com" label="DRYP Hub" external icon={ExternalLink} />
        <Shortcut href="https://dryp-ledger.vercel.app" label="DRYP Ledger" external icon={DollarSign} />
        <Shortcut href="/content" label="Content Engine" icon={Clapperboard} />
        <Shortcut href="/business" label="Business" icon={Users} />
        <Shortcut href="/trading" label="Trading" icon={TrendingUp} />
      </div>
    </div>
  )
}

// ── small presentational helpers ──
function Card({ title, accent, href, children }: { title: string; accent: string; href?: string; children: React.ReactNode }) {
  const head = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent }}>{title}</span>
      {href && <ArrowUpRight size={14} color="var(--muted)" />}
    </div>
  )
  const body = (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, height: '100%', boxSizing: 'border-box' }}>
      {head}{children}
    </div>
  )
  return href && href.startsWith('/') ? <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{body}</Link> : body
}
function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ?? 'var(--foreground)', letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 1 }}>{label}</div>
    </div>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{children}</div>
}
function Shortcut({ href, label, icon: Icon, external }: { href: string; label: string; icon: React.ElementType; external?: boolean }) {
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
    fontSize: 13, color: 'var(--foreground-2)', textDecoration: 'none',
  }
  const inner = <><Icon size={14} color="var(--accent)" />{label}</>
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{inner}</a>
    : <Link href={href} style={style}>{inner}</Link>
}
