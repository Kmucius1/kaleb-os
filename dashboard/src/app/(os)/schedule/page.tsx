import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { resolveDay } from '@/lib/rhythm/day'
import Timeline from '@/components/rhythm/Timeline'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const initial = await resolveDay()

  return (
    <>
      <Suspense fallback={<div style={{ maxWidth: 520, margin: '0 auto', padding: 18 }}><div className="skel" style={{ height: 320 }} /></div>}>
        <Timeline initial={initial} />
      </Suspense>
      {/* Add anything to the day by talking to Atlas. */}
      <Link href="/atlas" className="press" aria-label="Add to schedule" style={{
        position: 'fixed', right: 20, bottom: 84, width: 56, height: 56, borderRadius: 18,
        background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 30px -6px color-mix(in srgb, var(--accent) 70%, transparent)', zIndex: 50,
      }}>
        <Plus size={24} color="#fff" />
      </Link>
    </>
  )
}
