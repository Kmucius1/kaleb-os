'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'

const PLATFORMS = [
  { value: 'reels', label: 'Reel / Short' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X / Thread' },
  { value: 'youtube', label: 'YouTube (long)' },
]

export default function GeneratePanel({ brandSlug, accent }: { brandSlug: string; accent: string }) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('reels')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setError(null); setOkMsg(null)
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandSlug, topic, platform }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'generation failed')
      setOkMsg(`Generated: "${data.piece?.hook?.slice(0, 60) ?? 'done'}…"`)
      setTopic('')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={14} color={accent} />
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', color: 'var(--foreground)' }}>GENERATE CONTENT</span>
      </div>
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic or angle — e.g. 'why most traders blow accounts on revenge trades'"
        rows={2}
        style={{
          width: '100%', background: 'var(--background)', color: 'var(--foreground)',
          border: '1px solid var(--border-2)', borderRadius: 6, padding: '10px 12px',
          fontSize: 13, resize: 'vertical', fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border-2)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }}
        >
          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: accent, color: '#000',
            border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700,
            cursor: loading || !topic.trim() ? 'default' : 'pointer', opacity: loading || !topic.trim() ? 0.5 : 1,
          }}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          {loading ? 'Generating…' : 'Generate'}
        </button>
        {okMsg && <span style={{ fontSize: 12, color: 'var(--green)' }}>{okMsg}</span>}
        {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
      </div>
      {loading && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Claude is writing — usually ~20s for a full script + beat sheet.</div>}
    </div>
  )
}
