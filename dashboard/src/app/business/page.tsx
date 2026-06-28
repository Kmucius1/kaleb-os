import { supabaseDryp } from '@/lib/supabaseDryp'
import { Briefcase } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 60

export default async function BusinessPage() {
  const [{ data: leads }, { data: accounts }, { data: projects }] = await Promise.all([
    supabaseDryp.from('leads').select('business_name,contact_name,stage,estimated_value,next_action,last_contact_date').order('created_at', { ascending: false }),
    supabaseDryp.from('accounts').select('business_name,is_active,health_status,monthly_retainer,onboarding_status').order('created_at', { ascending: false }),
    supabaseDryp.from('projects').select('name,status,phase,billing_amount,due_date,account_id').order('created_at', { ascending: false }),
  ])

  const allLeads = leads ?? []
  const allAccounts = accounts ?? []
  const allProjects = projects ?? []

  const activeAccounts = allAccounts.filter(a => a.is_active)
  const activeProjects = allProjects.filter(p => p.status === 'active')
  const pipelineValue = allLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)
  const projectRevenue = activeProjects.reduce((sum, p) => sum + (p.billing_amount ?? 0), 0)

  function stageColor(stage: string) {
    const map: Record<string, string> = {
      not_started: 'var(--muted)',
      in_progress: 'var(--accent)',
      won: '#22c55e',
      lost: 'var(--red)',
      on_hold: '#f59e0b',
    }
    return map[stage] ?? 'var(--muted)'
  }

  function healthColor(h: string) {
    const map: Record<string, string> = {
      good: '#22c55e',
      new: '#3b82f6',
      at_risk: '#f59e0b',
      churned: 'var(--red)',
    }
    return map[h] ?? 'var(--muted)'
  }

  function phaseLabel(phase: string) {
    return phase?.replace(/_/g, ' ') ?? '—'
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Briefcase size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>BUSINESS</span>
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>DRYP · Advantage Media Agency</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'PIPELINE VALUE', value: `$${pipelineValue.toLocaleString()}`, color: '#f59e0b' },
          { label: 'ACTIVE CLIENTS', value: String(activeAccounts.length), color: '#22c55e' },
          { label: 'ACTIVE PROJECTS', value: String(activeProjects.length), color: 'var(--accent)' },
          { label: 'PROJECT REVENUE', value: `$${projectRevenue.toLocaleString()}`, color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px' }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Leads Pipeline */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 10 }}>
            LEADS PIPELINE ({allLeads.length})
          </div>
          {allLeads.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
              — no leads yet —
            </div>
          ) : (
            allLeads.map((lead, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{lead.business_name?.trim()}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: stageColor(lead.stage), border: `1px solid ${stageColor(lead.stage)}33`, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em', whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {lead.stage?.replace(/_/g, ' ').toUpperCase() ?? '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{lead.contact_name}</div>
                  {lead.estimated_value && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>${lead.estimated_value.toLocaleString()}</div>
                  )}
                </div>
                {lead.next_action && (
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, borderTop: '1px solid #1a1a1a', paddingTop: 4 }}>
                    Next: {lead.next_action.slice(0, 60)}{lead.next_action.length > 60 ? '…' : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Active Projects */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 10 }}>
            ACTIVE PROJECTS ({activeProjects.length})
          </div>
          {activeProjects.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
              — no active projects —
            </div>
          ) : (
            activeProjects.map((p, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{p.name}</div>
                  {p.billing_amount && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', whiteSpace: 'nowrap', marginLeft: 8 }}>${p.billing_amount.toLocaleString()}</div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{phaseLabel(p.phase)}</div>
                  {p.due_date && (
                    <div style={{ fontSize: 9, color: 'var(--muted)' }}>Due {new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Clients */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 10 }}>
        CLIENT ROSTER ({activeAccounts.length} active)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {allAccounts.map((a, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', opacity: a.is_active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{a.business_name?.trim()}</div>
              <span style={{ fontSize: 8, fontWeight: 700, color: healthColor(a.health_status), letterSpacing: '0.06em' }}>
                {a.health_status?.toUpperCase() ?? '—'}
              </span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)' }}>
              {a.is_active ? 'Active' : 'Inactive'} · {a.onboarding_status ?? '—'}
              {a.monthly_retainer ? ` · $${a.monthly_retainer}/mo` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
