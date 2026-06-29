import { supabaseDryp } from '@/lib/supabaseDryp'
import { supabase } from '@/lib/supabase'
import { getRevenueSnapshot, type RevenueSnapshot } from '@/lib/ledger'
import InlineSelect from '@/components/InlineSelect'
import { Briefcase, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

const LEAD_STAGES = ['not_started', 'info_collected', 'in_progress', 'waiting_on_client', 'finalizing', 'completed', 'won', 'lost', 'nurture']
const HEALTH = ['excellent', 'good', 'at_risk', 'churning', 'new']
const STAGE_COLOR: Record<string, string> = {
  not_started: '#60a5fa', info_collected: '#60a5fa', in_progress: '#fbbf24', waiting_on_client: '#fbbf24',
  finalizing: '#a78bfa', completed: '#34d399', won: '#34d399', lost: '#f87171', nurture: '#6b7280',
}
const HEALTH_COLOR: Record<string, string> = {
  excellent: '#34d399', good: '#34d399', new: '#60a5fa', at_risk: '#fbbf24', churning: '#f87171',
}
const money = (n: number) => '$' + Math.round(n).toLocaleString()
const OPEN = (s: string) => !['won', 'lost', 'completed'].includes(s)

export default async function BusinessPage() {
  const [{ data: leads }, { data: accounts }, { data: brands }] = await Promise.all([
    supabaseDryp.from('leads').select('id,business_name,contact_name,stage,estimated_value,next_action,source').order('created_at', { ascending: false }),
    supabaseDryp.from('accounts').select('id,business_name,is_active,health_status,monthly_retainer,onboarding_status').order('business_name'),
    supabase.from('brands').select('crm_account_id,services').not('crm_account_id', 'is', null),
  ])
  let rev: RevenueSnapshot | null = null
  try { rev = await getRevenueSnapshot() } catch { /* ledger optional */ }

  const allLeads = leads ?? []
  const openLeads = allLeads.filter(l => OPEN(l.stage))
  const activeAccounts = (accounts ?? []).filter(a => a.is_active)
  const pipeline = openLeads.reduce((s, l) => s + Number(l.estimated_value ?? 0), 0)
  const mrr = activeAccounts.reduce((s, a) => s + Number(a.monthly_retainer ?? 0), 0)
  const servicesByAcct = new Map((brands ?? []).map(b => [b.crm_account_id, b.services as string[]]))

  return (
    <div className="page-pad" style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <Briefcase size={18} color="#14b8a6" />
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>DRYP</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Agency · CRM</span>
        <a href="https://www.dryphub.com" target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--foreground-2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 12px' }}>
          <ExternalLink size={13} color="#14b8a6" /> DRYP Hub
        </a>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ margin: '0 0 26px' }}>
        <StatCard label="PIPELINE" value={money(pipeline)} accent="#fbbf24" sub="open" />
        <StatCard label="MRR" value={money(mrr)} accent="#34d399" sub="retainers" />
        <StatCard label="CLIENTS" value={String(activeAccounts.length)} accent="#22d3ee" sub="active" />
        <StatCard label="CASH IN" value={rev ? money(rev.cashIn) : '—'} accent="#a78bfa" sub={rev ? `${money(rev.thisMonth)} this mo` : 'CFO'} />
      </div>

      {/* LEADS */}
      <SectionTitle>LEADS · {openLeads.length} open</SectionTitle>
      <div className="card-list">
        {allLeads.map(l => (
          <div key={l.id} className="list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(l.business_name || '—').trim()}</div>
                {l.contact_name && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{l.contact_name}</div>}
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap' }}>{l.estimated_value ? money(Number(l.estimated_value)) : '—'}</div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <InlineSelect table="leads" id={l.id} field="stage" value={l.stage} options={LEAD_STAGES} colors={STAGE_COLOR} />
              {l.source && <Chip text={l.source} />}
            </div>
            {l.next_action && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>→ {l.next_action}</div>}
          </div>
        ))}
        {allLeads.length === 0 && <div className="list-card" style={{ color: 'var(--muted)' }}>No leads.</div>}
      </div>

      {/* CLIENTS */}
      <div style={{ height: 26 }} />
      <SectionTitle>CLIENTS · {activeAccounts.length} active</SectionTitle>
      <div className="card-list">
        {activeAccounts.map(a => {
          const svc = servicesByAcct.get(a.id) ?? []
          return (
            <div key={a.id} className="list-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(a.business_name || '—').trim()}</div>
                <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', color: 'var(--foreground-2)' }}>{a.monthly_retainer ? money(Number(a.monthly_retainer)) + '/mo' : '—'}</div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <InlineSelect table="accounts" id={a.id} field="health_status" value={a.health_status} options={HEALTH} colors={HEALTH_COLOR} />
                {svc.length ? svc.map(s => <Chip key={s} text={s.replace('_', ' ')} />) : null}
              </div>
              {a.onboarding_status && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>onboarding: {(a.onboarding_status || '').replace(/_/g, ' ')}</div>}
            </div>
          )
        })}
        {activeAccounts.length === 0 && <div className="list-card" style={{ color: 'var(--muted)' }}>No active clients.</div>}
      </div>
    </div>
  )
}

// helpers
function StatCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 14, padding: '14px 15px' }}>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--foreground-2)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--foreground-2)', marginBottom: 10 }}>{children}</div>
}
function Chip({ text }: { text: string }) {
  return <span style={{ fontSize: 11, color: 'var(--foreground-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', textTransform: 'capitalize' }}>{text}</span>
}
