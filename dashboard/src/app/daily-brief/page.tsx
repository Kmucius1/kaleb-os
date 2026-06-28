import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { FileText, Star, AlertTriangle, Zap } from 'lucide-react'

export const revalidate = 300

export default async function DailyBriefPage() {
  const { data: recommendations } = await supabase
    .from('agent_recommendations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York',
  })

  const all = recommendations ?? []
  const allTasks = tasks ?? []

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="var(--accent)" />
          <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>DAILY BRIEF</span>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{now}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {/* Top Priorities */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,102,0,0.06)' }}>
            <Star size={12} color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em' }}>TODAY'S TOP PRIORITIES</span>
          </div>
          <div style={{ padding: '14px' }}>
            {[
              'Close / follow up on highest-value business opportunity',
              'Execute trading plan without discipline violation',
              'Capture or publish one content asset',
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)', borderRadius: 3, padding: '2px 6px', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={12} color="#f59e0b" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.1em' }}>PENDING TASKS ({allTasks.length})</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {allTasks.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 11, padding: '20px 14px', textAlign: 'center' }}>— all clear —</div>
            ) : (
              allTasks.slice(0, 6).map(t => (
                <div key={t.id} style={{ padding: '8px 14px', borderBottom: '1px solid #161616', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--foreground)' }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{t.description.slice(0, 80)}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <AlertTriangle size={13} color="var(--accent)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em' }}>HERMES RECOMMENDATIONS ({all.length})</span>
        </div>
        {all.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
            <div style={{ marginBottom: 8 }}>— no recommendations yet —</div>
            <div style={{ fontSize: 10, color: '#333' }}>Tell Hermes in Telegram: "analyze my priorities and give me today's recommendations"</div>
          </div>
        ) : (
          all.map(r => (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>{r.title}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{formatTime(r.created_at)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--foreground-2)', lineHeight: 1.5 }}>{r.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
