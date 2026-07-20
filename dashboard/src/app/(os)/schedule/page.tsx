import { getScheduleForDate } from '@/lib/schedule'
import ScheduleView from '@/components/ScheduleView'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const initial = await getScheduleForDate(today)

  return (
    <>
      <ScheduleView initial={initial} />
      {/* FAB → add via Atlas */}
      <Link href="/" className="press" title="Add to schedule" style={{
        position: 'fixed', right: 20, bottom: 84, width: 54, height: 54, borderRadius: 18,
        background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 30px -6px color-mix(in srgb, var(--accent) 70%, transparent)', zIndex: 50,
      }}>
        <Plus size={24} color="#fff" />
      </Link>
    </>
  )
}
