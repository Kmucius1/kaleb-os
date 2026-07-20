'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Loader2, Check } from 'lucide-react'

const CHIPS = [
  { key: 'thought', label: 'Thought', color: '#a855f7' },
  { key: 'win', label: 'Win', color: '#34d399' },
  { key: 'gratitude', label: 'Gratitude', color: '#8b5cf6' },
  { key: 'lesson', label: 'Lesson', color: '#fbbf24' },
]

export default function JournalCapture() {
  const router = useRouter()
  const [kind, setKind] = useState('thought')
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const recRef = useRef<any>(null)

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input needs Safari/Chrome. You can type or dictate with the keyboard mic.'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true
    let base = text ? text + ' ' : ''
    rec.onresult = (e: any) => {
      let s = ''
      for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript
      setText((base + s).trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec; setListening(true); rec.start()
  }

  async function save() {
    if (!text.trim()) return
    setSaving(true)
    try {
      await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text.trim(), kind }) })
      setText(''); setSaved(true); setTimeout(() => setSaved(false), 1800)
      router.refresh()
    } finally { setSaving(false) }
  }

  return (
    <div className="pcard rise rise-2" style={{ padding: 18 }}>
      <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>What&apos;s on your mind?</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CHIPS.map(c => (
          <button key={c.key} onClick={() => setKind(c.key)} className="press" style={{
            fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            background: kind === c.key ? `${c.color}22` : 'var(--surface-2)',
            color: kind === c.key ? c.color : 'var(--foreground-2)',
            border: `1px solid ${kind === c.key ? c.color : 'var(--border)'}`,
          }}>{c.label}</button>
        ))}
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Speak or type… Atlas will remember."
        rows={2} style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px', color: 'var(--foreground)', fontSize: 14.5, fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: 14 }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button onClick={toggleMic} className="press" style={{
          width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: listening ? '#ef4444' : 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: listening ? '0 0 0 6px rgba(239,68,68,0.18)' : '0 8px 26px -6px color-mix(in srgb, var(--accent) 65%, transparent)',
        }}>
          <Mic size={24} color="#fff" />
        </button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{listening ? 'Listening… tap to stop' : 'Tap to speak'}</span>
      </div>

      {text.trim() && (
        <button onClick={save} disabled={saving} className="press" style={{
          width: '100%', marginTop: 14, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving ? <Loader2 size={16} className="spin" /> : saved ? <><Check size={16} /> Saved</> : 'Save entry'}
        </button>
      )}
    </div>
  )
}
