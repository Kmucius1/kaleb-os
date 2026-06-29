'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { User, Building2 } from 'lucide-react'
import type { Space } from '@/lib/space'

const SPACES: { id: Space; label: string; color: string; icon: React.ElementType }[] = [
  { id: 'personal', label: 'Personal', color: '#6366f1', icon: User },
  { id: 'dryp', label: 'DRYP', color: '#14b8a6', icon: Building2 },
]

// Slim global bar with the Personal ⇄ DRYP switch.
// Hidden on the Atlas chat home and the login screen.
export default function SpaceBar({ current }: { current: Space }) {
  const pathname = usePathname()
  const router = useRouter()
  const [space, setSpace] = useState<Space>(current)

  if (pathname === '/' || pathname?.startsWith('/login')) return null

  function choose(next: Space) {
    if (next === space) return
    setSpace(next)
    document.cookie = `kos_space=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  const active = SPACES.find(s => s.id === space)!

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', borderBottom: '1px solid var(--border)',
      background: 'var(--background)', flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', flex: 1, maxWidth: 320, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 11, padding: 3, gap: 3,
      }}>
        {SPACES.map(s => {
          const Icon = s.icon
          const on = s.id === space
          return (
            <button key={s.id} onClick={() => choose(s.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em',
              background: on ? s.color : 'transparent',
              color: on ? '#fff' : 'var(--foreground-2)',
              transition: 'all 0.15s',
            }}>
              <Icon size={15} strokeWidth={2.4} />
              {s.label}
            </button>
          )
        })}
      </div>
      <span className="hide-narrow" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
        {active.id === 'dryp' ? 'The agency — clients & revenue' : 'You + your missions'}
      </span>
    </div>
  )
}
