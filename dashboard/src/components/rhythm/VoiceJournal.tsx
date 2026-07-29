'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Mic, Pause, Square } from 'lucide-react'
import ProposalReview, { type Proposal } from './ProposalReview'
import { enqueue, queueCount, startOutbox } from '@/lib/rhythm/outbox'

// Voice-first journaling. Typing is the fallback, not the default.
//
// Three daily moments carry their own prompts; the ad-hoc kinds are one tap
// away. Nothing here diagnoses emotion — it records what Kaleb says and asks
// how he'd label it himself.

type Moment = 'morning' | 'midday' | 'evening' | 'trading' | 'idea' | 'gratitude' | 'win' | 'lesson' | 'freeform'

const MOMENTS: { key: Moment; label: string; color: string; primary?: boolean }[] = [
  { key: 'morning', label: 'Morning', color: 'var(--spirit)', primary: true },
  { key: 'midday', label: 'Midday', color: 'var(--mind)', primary: true },
  { key: 'evening', label: 'Evening', color: 'var(--accent)', primary: true },
  { key: 'trading', label: 'Trading', color: 'var(--money)' },
  { key: 'idea', label: 'Idea', color: 'var(--mission)' },
  { key: 'gratitude', label: 'Gratitude', color: 'var(--spirit)' },
  { key: 'win', label: 'Win', color: 'var(--green)' },
  { key: 'lesson', label: 'Lesson', color: 'var(--yellow)' },
  { key: 'freeform', label: 'Freeform', color: 'var(--muted)' },
]

const PROMPTS: Record<Moment, string[]> = {
  morning: [
    'Who am I choosing to be today?',
    'What are the three most important outcomes?',
    'What would make today feel aligned?',
    'What emotion or thought needs attention?',
  ],
  midday: [
    'What moved the business forward?',
    'What slowed me down?',
    'What is still unfinished?',
    'What deserves tomorrow’s attention?',
  ],
  evening: [
    'What did I build?',
    'What challenged me?',
    'What am I grateful for?',
    'Did I live by my values?',
    'Who did I become today?',
    'What must happen tomorrow?',
  ],
  trading: ['Did I follow my rules?', 'What was my bias?', 'Where did emotion enter?'],
  idea: ['What is the idea?', 'Why now?'],
  gratitude: ['What are you grateful for right now?'],
  win: ['What went right, and why?'],
  lesson: ['What did this teach you?'],
  freeform: [],
}

const MOODS = ['great', 'good', 'ok', 'low', 'stressed', 'tired']

/** Pick the moment that matches the time of day. */
function defaultMoment(): Moment {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date())) % 24
  if (h < 10) return 'morning'
  if (h < 18) return 'midday'
  return 'evening'
}

type Rec = { stop: () => void; start: () => void; abort: () => void }

export default function VoiceJournal() {
  const router = useRouter()
  const [moment, setMoment] = useState<Moment>('morning')
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [mood, setMood] = useState<string | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [review, setReview] = useState<{ summary: string; proposals: Proposal[] } | null>(null)
  const [extractNote, setExtractNote] = useState('')
  const [queued, setQueued] = useState(0)
  const recRef = useRef<Rec | null>(null)
  const baseRef = useRef('')

  useEffect(() => { setMoment(defaultMoment()); setQueued(queueCount()) }, [])

  // Flush anything written offline as soon as the connection returns.
  useEffect(() => startOutbox(() => { setQueued(queueCount()); router.refresh() }), [router])
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => { recRef.current?.abort?.() }
  }, [])

  function toggleMic() {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const w = window as unknown as { SpeechRecognition?: new () => never; webkitSpeechRecognition?: new () => never }
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => Record<string, unknown>) | undefined
    if (!SR) { setSupported(false); return }

    const rec = new SR() as Record<string, unknown> & Rec
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = true
    baseRef.current = text ? text + ' ' : ''
    rec.onresult = (e: { resultIndex: number; results: { [i: number]: { [j: number]: { transcript: string } }; length: number } }) => {
      let s = ''
      for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript
      setText((baseRef.current + s).trim())
    }
    rec.onerror = () => { setListening(false); setError('Microphone stopped. Your text is safe — tap to resume.') }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setError('')
    setListening(true)
    rec.start()
  }

  async function save() {
    if (!text.trim()) return
    setSaving(true); setError('')

    const entry = {
      content: text.trim(), moment, transcript: text.trim(),
      mood: mood ?? undefined, energy: energy ?? undefined,
      pillar: moment === 'trading' ? 'Money' : moment === 'idea' ? 'Mission' : 'Spirit',
    }

    // No signal — keep it on the device rather than losing what he just said.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      enqueue('/api/journal', entry, 'Journal entry')
      recRef.current?.stop()
      setText(''); setMood(null); setEnergy(null); setSaved(true)
      setQueued(queueCount())
      setExtractNote('Saved on this device — it will sync when you\u2019re back online.')
      setTimeout(() => setSaved(false), 2000)
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) throw new Error('Could not save')
      const { id } = await res.json()
      recRef.current?.stop()
      setText(''); setMood(null); setEnergy(null); setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()

      // The entry is already safe. Extraction runs after, and a failure here
      // never costs him the entry — it just means no proposals this time.
      if (id) {
        setExtracting(true); setExtractNote('')
        try {
          const ex = await fetch('/api/journal/extract', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ journal_id: id }),
          })
          if (ex.ok) {
            const data = await ex.json()
            if (data.ok === false) setExtractNote(data.reason ?? 'Couldn’t read the entry back.')
            else setReview({ summary: data.summary ?? '', proposals: data.proposals ?? [] })
          }
        } catch { /* entry is saved; proposals are a bonus */ }
        finally { setExtracting(false) }
      }
    } catch (e) {
      // The request died mid-flight — queue it rather than blaming him for it.
      enqueue('/api/journal', entry, 'Journal entry')
      setText(''); setMood(null); setEnergy(null)
      setQueued(queueCount())
      setExtractNote('Couldn\u2019t reach the server, so it\u2019s saved on this device and will sync automatically.')
      void e
    } finally { setSaving(false) }
  }

  const active = MOMENTS.find(m => m.key === moment)!
  const prompts = PROMPTS[moment]

  return (
    <div className="pcard rise rise-2" style={{ padding: 18 }}>
      {/* Moment */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {MOMENTS.filter(m => m.primary).map(m => (
          <button key={m.key} onClick={() => setMoment(m.key)} className="press" style={{
            flex: 1, minHeight: 44, borderRadius: 13, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: moment === m.key ? `color-mix(in srgb, ${m.color} 18%, transparent)` : 'var(--surface-2)',
            color: moment === m.key ? m.color : 'var(--foreground-2)',
            border: `1px solid ${moment === m.key ? m.color : 'var(--border)'}`,
          }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {MOMENTS.filter(m => !m.primary).map(m => (
          <button key={m.key} onClick={() => setMoment(m.key)} className="press" style={{
            minHeight: 34, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: moment === m.key ? `color-mix(in srgb, ${m.color} 18%, transparent)` : 'transparent',
            color: moment === m.key ? m.color : 'var(--muted)',
            border: `1px solid ${moment === m.key ? m.color : 'var(--border)'}`,
          }}>{m.label}</button>
        ))}
      </div>

      {/* Mic */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
        <button
          onClick={toggleMic}
          aria-label={listening ? 'Pause dictation' : 'Start dictation'}
          className="press"
          style={{
            width: 92, height: 92, borderRadius: '50%', cursor: 'pointer', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: listening
              ? `color-mix(in srgb, ${active.color} 28%, transparent)`
              : 'var(--surface-2)',
            boxShadow: listening ? `0 0 44px -6px color-mix(in srgb, ${active.color} 60%, transparent)` : 'none',
            transition: 'all .25s var(--ease)',
          }}
        >
          {listening
            ? <Pause size={32} color={active.color} className="breathe" />
            : <Mic size={32} color="var(--foreground-2)" />}
        </button>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>
          {listening ? 'Listening — tap to pause' : supported ? 'Tap to talk' : 'Voice unavailable here — type below'}
        </span>
      </div>

      {/* Prompts */}
      {prompts.length > 0 && !text && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {prompts.map(p => (
            <button key={p} onClick={() => setText(t => (t ? `${t}\n\n${p} ` : `${p} `))} className="press" style={{
              textAlign: 'left', padding: '11px 13px', borderRadius: 12, cursor: 'pointer', minHeight: 44,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--foreground-2)', fontSize: 12.5, lineHeight: 1.35,
            }}>{p}</button>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Say it or type it…"
        rows={text ? 8 : 4}
        style={{
          width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '13px 14px', color: 'var(--foreground)', fontSize: 14.5,
          lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', marginBottom: 14,
        }}
      />

      {/* Mood + energy — self-labelled, never inferred */}
      <div className="label" style={{ marginBottom: 8 }}>How does this feel?</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {MOODS.map(m => (
          <button key={m} onClick={() => setMood(mood === m ? null : m)} className="press" style={{
            minHeight: 34, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, textTransform: 'capitalize',
            background: mood === m ? 'var(--accent-dim)' : 'transparent',
            color: mood === m ? 'var(--accent)' : 'var(--muted)',
            border: `1px solid ${mood === m ? 'var(--accent)' : 'var(--border)'}`,
          }}>{m}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', width: 52 }}>Energy</span>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setEnergy(energy === n ? null : n)} aria-label={`Energy ${n}`} className="press" style={{
            flex: 1, minHeight: 38, borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
            background: energy != null && n <= energy ? 'var(--body)' : 'var(--surface-2)',
            color: energy != null && n <= energy ? '#07100c' : 'var(--muted)',
            border: '1px solid var(--border)',
          }}>{n}</button>
        ))}
      </div>

      {error && <p style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 10px' }}>{error}</p>}

      <button
        onClick={save}
        disabled={!text.trim() || saving}
        className="press"
        style={{
          width: '100%', minHeight: 50, borderRadius: 14, cursor: text.trim() ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none',
          background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff',
          fontSize: 15, fontWeight: 700, opacity: !text.trim() || saving ? 0.45 : 1,
        }}
      >
        {saved ? <><Check size={17} />Saved</> : saving ? 'Saving…' : <><Square size={15} />Save entry</>}
      </button>

      {extracting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12, fontSize: 12.5, color: 'var(--muted)' }}>
          <span className="skel" style={{ width: 16, height: 16, borderRadius: '50%' }} />
          Reading it back…
        </div>
      )}

      {queued > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          {queued} {queued === 1 ? 'entry' : 'entries'} waiting to sync.
        </div>
      )}

      {extractNote && (
        <div style={{
          marginTop: 12, padding: '11px 13px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.45,
          background: 'var(--yellow-dim)', border: '1px solid color-mix(in srgb, var(--yellow) 28%, transparent)',
          color: 'var(--foreground-2)',
        }}>
          {extractNote}
        </div>
      )}

      {review && (
        <ProposalReview
          summary={review.summary}
          proposals={review.proposals}
          onDone={() => setReview(null)}
        />
      )}
    </div>
  )
}
