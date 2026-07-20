'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, ArrowUp, CheckCircle2, Volume2, VolumeX, Mic, LayoutDashboard, FileText, Activity, MessageCircle, TrendingUp, Lightbulb, Target, Rocket, ArrowRight } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string; actions?: { tool: string }[] }

const QUICK = [
  { label: 'Get Daily Briefing', sub: 'Your plan for today', icon: FileText, color: '#8b5cf6', prompt: 'Give me my daily briefing for today.' },
  { label: 'Analyze My Day', sub: 'How did I perform?', icon: Activity, color: '#a855f7', prompt: 'Analyze how my day is going — where am I aligned with my values, and where am I off?' },
  { label: 'Ask Anything', sub: 'Questions, ideas, strategy', icon: MessageCircle, color: '#6366f1', prompt: '' },
  { label: 'Voice Journal', sub: "Talk it out, I'll remember", icon: Mic, color: '#60a5fa', prompt: 'VOICE' },
]

const SUGGESTIONS = [
  { text: 'Review my trading performance', icon: TrendingUp, color: '#8b5cf6' },
  { text: 'Show me my content ideas', icon: Lightbulb, color: '#fbbf24' },
  { text: 'What should I focus on tomorrow?', icon: Target, color: '#fb7185' },
  { text: 'Give me a motivational push', icon: Rocket, color: '#a855f7' },
]

// strip markdown so spoken replies sound clean
const forSpeech = (t: string) => t.replace(/[#*_`|>-]/g, ' ').replace(/\s+/g, ' ').trim()

export default function HomeChat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speak, setSpeak] = useState(true)          // voice ON by default
  const [cost, setCost] = useState(0)               // running $ for this conversation
  const [listening, setListening] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recRef = useRef<{ stop: () => void } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load saved voice preference (default ON).
  useEffect(() => { if (localStorage.getItem('kos_speak') === '0') setSpeak(false) }, [])
  function toggleSpeak() { setSpeak(s => { const n = !s; localStorage.setItem('kos_speak', n ? '1' : '0'); return n }) }

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }) }, [messages, loading])

  // Reuse one Audio element, unlocked on a user gesture, so iOS lets replies
  // autoplay later — including replies to VOICE input, where say() runs outside
  // a gesture. Playing a tiny silent clip inside the gesture unlocks the element.
  const SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  function primeAudio() {
    try {
      if (!audioRef.current) audioRef.current = new Audio()
      const a = audioRef.current
      if (a.dataset.unlocked) return
      a.src = SILENT
      a.play().then(() => { a.dataset.unlocked = '1' }).catch(() => {})
    } catch { /* ignore */ }
  }

  async function say(text: string) {
    if (!speak) return
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: forSpeech(text) }) })
      if (!res.ok) throw new Error('tts')
      const url = URL.createObjectURL(await res.blob())
      const audio = audioRef.current ?? new Audio()
      audioRef.current = audio
      audio.src = url
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
    primeAudio()
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || '…'
      if (typeof data.cost === 'number') setCost(c => c + data.cost)
      setMessages([...next, { role: 'assistant', content: reply, actions: data.actions }])
      say(reply)
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: 'Error: ' + (e as Error).message }])
    } finally { setLoading(false) }
  }

  function toggleMic() {
    primeAudio() // unlock the speaker now (real tap) so the spoken reply can autoplay
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecog; webkitSpeechRecognition?: new () => SpeechRecog }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { alert('Voice input isn’t supported in this browser. Dictate with Wispr Flow into the box instead.'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true
    // Stream the transcript into the box LIVE so Kaleb can review/fix it before
    // sending, instead of auto-sending a mis-heard phrase.
    let finalText = ''
    rec.onresult = (e: SpeechResultEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      setInput((finalText + interim).replace(/\s+/g, ' ').trimStart())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec; rec.start(); setListening(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} color="#0a0b0f" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Atlas</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em' }}>Kaleb OS</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {cost > 0 && (
            <span title="Cost of this conversation" className="tabular" style={{ fontSize: 11, color: 'var(--muted)', marginRight: 2 }}>
              ${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(3)}
            </span>
          )}
          <button onClick={toggleSpeak} title="Speak replies" style={iconBtn(speak)}>
            {speak ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <Link href="/dashboard" title="Dashboard" style={{ ...iconBtn(false), textDecoration: 'none' }}><LayoutDashboard size={16} /></Link>
        </div>
      </div>

      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto 0', maxWidth: 480, width: '100%', paddingTop: 8 }}>
            {/* Orb */}
            <div className="rise rise-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
              <div className="orb" style={{ width: 150, height: 150, marginBottom: 22 }} />
              <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em' }}>How can I help you, Kaleb?</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>Atlas is listening.</div>
            </div>

            {/* Quick actions */}
            <div className="rise rise-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {QUICK.map(q => {
                const Icon = q.icon
                return (
                  <button key={q.label} className="pcard press" onClick={() => { if (q.prompt === 'VOICE') toggleMic(); else if (q.prompt === '') inputRef.current?.focus(); else send(q.prompt) }}
                    style={{ textAlign: 'left', cursor: 'pointer', padding: 14 }}>
                    <span className="grad-icon" style={{ width: 34, height: 34, background: `${q.color}22`, borderRadius: 10, marginBottom: 10, display: 'inline-flex' }}><Icon size={17} color={q.color} /></span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{q.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{q.sub}</div>
                  </button>
                )
              })}
            </div>

            {/* Suggested */}
            <div className="rise rise-3">
              <div className="label" style={{ margin: '0 2px 10px' }}>Suggested for you</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTIONS.map(s => {
                  const Icon = s.icon
                  return (
                    <button key={s.text} className="pcard press" onClick={() => send(s.text)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer', textAlign: 'left' }}>
                      <Icon size={17} color={s.color} />
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--foreground)' }}>{s.text}</span>
                      <ArrowRight size={16} color="var(--muted)" />
                    </button>
                  )
                })}
              </div>
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

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 14, padding: 6 }}>
          <button onClick={toggleMic} title="Talk" style={{ ...iconBtn(listening), width: 38, height: 38, flexShrink: 0 }}>
            <Mic size={18} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={listening ? 'Listening… (review before sending)' : 'Type, or tap the mic on your keyboard to dictate'}
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
interface SpeechRecog { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: (e: SpeechResultEvent) => void; onerror: () => void; onend: () => void }
interface SpeechResultEvent { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } }
