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
    <div style={{ padding: '28px 32px', maxWidth: 1180 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Briefcase size={17} color="var(--accent)" />
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Business</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>DRYP · CRM</span>
        <a href="https://www.dryphub.com" target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--foreground-2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
          <ExternalLink size={13} color="var(--accent)" /> Open DRYP Hub
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '20px 0 28px' }}>
        <StatCard label="PIPELINE (OPEN)" value={money(pipeline)} accent="#fbbf24" />
        <StatCard label="MRR (RETAINERS)" value={money(mrr)} accent="#34d399" />
        <StatCard label="ACTIVE CLIENTS" value={String(activeAccounts.length)} accent="#22d3ee" />
        <StatCard label="CASH IN (CFO)" value={rev ? money(rev.cashIn) : '—'} accent="#a78bfa" sub={rev ? `${money(rev.thisMonth)} this mo` : undefined} />
      </div>

      {/* LEADS */}
      <SectionTitle>LEADS · {openLeads.length} open</SectionTitle>
      <Table cols={['Lead', 'Stage', 'Est. value', 'Next action', 'Source']}>
        {allLeads.map(l => (
          <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
            <Td><b style={{ color: 'var(--foreground)' }}>{(l.business_name || '—').trim()}</b>{l.contact_name && <span style={{ color: 'var(--muted)' }}> · {l.contact_name}</span>}</Td>
            <Td><InlineSelect table="leads" id={l.id} field="stage" value={l.stage} options={LEAD_STAGES} colors={STAGE_COLOR} /></Td>
            <Td>{l.estimated_value ? money(Number(l.estimated_value)) : '—'}</Td>
            <Td muted>{l.next_action || '—'}</Td>
            <Td muted>{l.source || '—'}</Td>
          </tr>
        ))}
        {allLeads.length === 0 && <tr><Td muted>No leads.</Td></tr>}
      </Table>

      {/* CLIENTS */}
      <div style={{ height: 28 }} />
      <SectionTitle>CLIENTS · {activeAccounts.length} active</SectionTitle>
      <Table cols={['Client', 'Health', 'Retainer', 'Services (Kaleb OS)', 'Onboarding']}>
        {activeAccounts.map(a => {
          const svc = servicesByAcct.get(a.id) ?? []
          return (
            <tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
              <Td><b style={{ color: 'var(--foreground)' }}>{(a.business_name || '—').trim()}</b></Td>
              <Td><InlineSelect table="accounts" id={a.id} field="health_status" value={a.health_status} options={HEALTH} colors={HEALTH_COLOR} /></Td>
              <Td>{a.monthly_retainer ? money(Number(a.monthly_retainer)) + '/mo' : '—'}</Td>
              <Td>{svc.length ? svc.map(s => <Chip key={s} text={s.replace('_', ' ')} />) : <span style={{ color: 'var(--muted)' }}>—</span>}</Td>
              <Td muted>{(a.onboarding_status || '—').replace(/_/g, ' ')}</Td>
            </tr>
          )
        })}
        {activeAccounts.length === 0 && <tr><Td muted>No active clients.</Td></tr>}
      </Table>
    </div>
  )
}

// helpers
function StatCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--foreground-2)', marginBottom: 10 }}>{children}</div>
}
function Table({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr>{cols.map(c => <th key={c} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', fontWeight: 600 }}>{c.toUpperCase()}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <td style={{ padding: '11px 14px', color: muted ? 'var(--muted)' : 'var(--foreground-2)', verticalAlign: 'middle' }}>{children}</td>
}
function Chip({ text }: { text: string }) {
  return <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 5, padding: '2px 7px', marginRight: 5, textTransform: 'capitalize' }}>{text}</span>
}
