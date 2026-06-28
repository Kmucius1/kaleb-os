'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Inline editable dropdown that PATCHes a DRYP CRM record.
export default function InlineSelect({
  table, id, field, value, options, colors,
}: {
  table: 'leads' | 'accounts'
  id: string
  field: string
  value: string
  options: string[]
  colors?: Record<string, string>
}) {
  const router = useRouter()
  const [v, setV] = useState(value || options[0])
  const [saving, setSaving] = useState(false)

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const nv = e.target.value
    setV(nv); setSaving(true)
    try {
      await fetch('/api/crm/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, patch: { [field]: nv } }),
      })
      router.refresh()
    } finally { setSaving(false) }
  }

  const c = colors?.[v] ?? 'var(--foreground-2)'
  return (
    <select value={v} onChange={change} disabled={saving} style={{
      background: 'var(--background)', color: c, border: `1px solid ${c}33`,
      borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
      opacity: saving ? 0.5 : 1, textTransform: 'capitalize',
    }}>
      {options.map(o => <option key={o} value={o} style={{ color: 'var(--foreground)' }}>{o.replace(/_/g, ' ')}</option>)}
    </select>
  )
}
