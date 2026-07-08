'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'

// Kaleb feeds a product idea. It runs through the SAME success-rate model as the
// scout, then shows the instant verdict.
export default function AddProduct() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; color: string } | null>(null)

  async function submit() {
    if (!name.trim() || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/commerce/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), url: url.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ text: data.error || 'Failed', color: 'var(--red)' }); return }
      const r = data.result
      const color = r.disqualified ? 'var(--red)' : r.verdict === 'winner' ? 'var(--green)' : r.verdict === 'maybe' ? 'var(--yellow)' : 'var(--muted)'
      const verdict = r.disqualified ? `Disqualified — ${r.disqualify_reason}` : `${r.verdict.toUpperCase()} · ${r.success_probability}/100`
      setMsg({ text: `Scored "${name.trim()}": ${verdict}`, color })
      setName(''); setUrl('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const input: React.CSSProperties = {
    background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 9,
    padding: '10px 12px', fontSize: 13.5, color: 'var(--foreground)', width: '100%',
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Feed the Scout a product idea</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 220px' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Product name / idea"
            onKeyDown={e => e.key === 'Enter' && submit()} style={input} />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Reference URL (optional)"
            onKeyDown={e => e.key === 'Enter' && submit()} style={input} />
        </div>
        <button onClick={submit} disabled={busy || !name.trim()} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 9,
          border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 700,
          cursor: 'pointer', opacity: busy || !name.trim() ? 0.5 : 1,
        }}>
          {busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} {busy ? 'Scoring…' : 'Score it'}
        </button>
      </div>
      {msg && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: msg.color }}>{msg.text}</div>}
      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--muted)' }}>Every idea passes the same 12-factor gate — winners land in the queue above.</div>
    </div>
  )
}
