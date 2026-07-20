'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

export default function GenerateBriefButton({ type = 'morning', label }: { type?: 'morning' | 'evening'; label: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      await fetch('/api/brief/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
      router.refresh()
    } finally { setBusy(false) }
  }
  return (
    <button onClick={go} disabled={busy} className="press" style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12, border: 'none',
      background: 'var(--accent-grad)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
    }}>
      {busy ? <><Loader2 size={16} className="spin" /> Generating…</> : <><Sparkles size={16} /> {label}</>}
    </button>
  )
}
