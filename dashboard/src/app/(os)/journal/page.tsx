import { supabase } from '@/lib/supabase'
import JournalView from '@/components/JournalView'
import { Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function JournalPage() {
  const [{ data: entries }, { data: patterns }] = await Promise.all([
    supabase.from('journal').select('id,content,kind,created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('patterns').select('*').order('created_at', { ascending: false }).limit(3).then(r => r, () => ({ data: [] as any[] })),
  ])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Journal</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><Search size={17} color="var(--foreground-2)" /></span>
      </div>

      <JournalView entries={entries ?? []} patterns={patterns ?? []} />
    </div>
  )
}
