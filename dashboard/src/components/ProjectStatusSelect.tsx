'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Sets Kaleb's manual label on a GitHub repo (overrides raw git-activity bucket).
const OPTIONS = ['', 'working', 'live', 'shelved', 'idea'] as const
const LABELS: Record<string, string> = { '': 'auto', working: 'working', live: 'live', shelved: 'shelved', idea: 'idea' }
const COLORS: Record<string, string> = { working: '#10b981', live: '#3b82f6', shelved: '#f59e0b', idea: '#8b5cf6', '': 'var(--muted)' }

export default function ProjectStatusSelect({ repo, value }: { repo: string; value: string | null }) {
  const router = useRouter()
  const [v, setV] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const nv = e.target.value
    setV(nv); setSaving(true)
    try {
      await fetch('/api/projects/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, status: nv || null }),
      })
      router.refresh()
    } finally { setSaving(false) }
  }

  const c = COLORS[v] ?? 'var(--muted)'
  return (
    <select value={v} onChange={change} disabled={saving} onClick={(e) => e.stopPropagation()} style={{
      background: 'var(--background)', color: c, border: `1px solid ${c}33`,
      borderRadius: 5, padding: '3px 6px', fontSize: 10, cursor: 'pointer',
      opacity: saving ? 0.5 : 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700,
    }}>
      {OPTIONS.map(o => <option key={o} value={o} style={{ color: 'var(--foreground)' }}>{LABELS[o]}</option>)}
    </select>
  )
}
