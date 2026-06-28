'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, ArrowUp, CheckCircle2, Volume2, VolumeX, Mic, LayoutDashboard } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string; actions?: { tool: string }[] }

const SUGGESTIONS = [
  'How much is DRYP making this month?',
  'What client items are pressing today?',
  'How was my P&L last week?',
  'Draft a follow-up for Tyler at Crafted',
]

// strip markdown so spoken replies sound clean
const forSpeech = (t: string) => t.replace(/[#*_`|>-]/g, ' ').replace(/\s+/g, ' ').trim()

export default function HomeChat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speak, setSpeak] = useState(false)
  const [listening, setListening] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const recRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }) }, [messages, loading])

  async function say(text: string) {
    if (!speak) return
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: forSpeech(text) }) })
      if (!res.ok) throw new Error('tts')
      const url = URL.createObjectURL(await res.blob())
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch {
      // fallback to free browser voice
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(forSpeech(text)))
      }
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || '…'
      setMessages([...next, { role: 'assistant', content: reply, actions: data.actions }])
      say(reply)
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: 'Error: ' + (e as Error).message }])
    } finally { setLoading(false) }
  }

  function toggleMic() {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecog; webkitSpeechRecognition?: new () => SpeechRecog }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { alert('Voice input isn’t supported in this browser. Dictate with Wispr Flow into the box instead.'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = false
    rec.onresult = (e: SpeechResultEvent) => { const t = e.results[0][0].transcript; setListening(false); send(t) }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec; rec.start(); setListening(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} color="#0a0b0f" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Atlas</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em' }}>Kaleb OS</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setSpeak(s => !s)} title="Speak replies" style={iconBtn(speak)}>
            {speak ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <Link href="/dashboard" title="Dashboard" style={{ ...iconBtn(false), textDecoration: 'none' }}><LayoutDashboard size={16} /></Link>
        </div>
      </div>

      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 15, color: 'var(--foreground-2)', marginBottom: 16 }}>Morning. Talk to me — money, clients, content, trades, or just what&apos;s on your mind.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--foreground-2)', fontSize: 13.5, cursor: 'pointer', textAlign: 'left' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            <div style={{
              background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              color: m.role === 'user' ? '#fff' : 'var(--foreground)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              borderRadius: 14, padding: '11px 14px', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap',
            }}>{m.content}</div>
            {m.actions && m.actions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {m.actions.map((a, j) => (
                  <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--green)' }}>
                    <CheckCircle2 size={11} /> {a.tool.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-start', color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={14} className="spin" /> thinking…</div>}
      </div>

      <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 14, padding: 6 }}>
          <button onClick={toggleMic} title="Talk" style={{ ...iconBtn(listening), width: 38, height: 38, flexShrink: 0 }}>
            <Mic size={18} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={listening ? 'Listening…' : 'Talk or type… (or dictate with Wispr Flow)'}
            rows={1}
            style={{ flex: 1, background: 'transparent', color: 'var(--foreground)', border: 'none', outline: 'none', resize: 'none', fontSize: 15, fontFamily: 'inherit', padding: '8px 4px', maxHeight: 140, lineHeight: 1.4 }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: input.trim() ? 'var(--accent)' : 'var(--surface-2)', color: input.trim() ? '#fff' : 'var(--muted)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{loading ? <Loader2 size={16} className="spin" /> : <ArrowUp size={18} />}</button>
        </div>
      </div>
    </div>
  )
}

function iconBtn(active: boolean): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'var(--accent)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--foreground-2)',
    border: '1px solid var(--border)', cursor: 'pointer',
  }
}

// minimal Web Speech types
interface SpeechRecog { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: SpeechResultEvent) => void; onerror: () => void; onend: () => void }
interface SpeechResultEvent { results: { [i: number]: { [j: number]: { transcript: string } } } }
