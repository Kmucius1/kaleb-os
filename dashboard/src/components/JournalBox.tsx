'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, PenLine } from 'lucide-react'

export default function JournalBox({ doneToday }: { doneToday: boolean }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(doneToday)

  async function save() {
    if (!content.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, kind: 'meditation' }),
      })
      if (res.ok) { setContent(''); setSaved(true); router.refresh() }
    } finally { setSaving(false) }
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={saved ? 'Add another reflection…' : 'How was your meditation? What came up?'}
        rows={3}
        style={{
          width: '100%', background: 'var(--background)', color: 'var(--foreground)',
          border: '1px solid var(--border-2)', borderRadius: 10, padding: '10px 12px',
          fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button onClick={save} disabled={saving || !content.trim()} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: content.trim() ? 'var(--accent)' : 'var(--surface-2)',
          color: content.trim() ? '#fff' : 'var(--muted)',
          border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
          cursor: saving || !content.trim() ? 'default' : 'pointer',
        }}>
          {saving ? <Loader2 size={13} className="spin" /> : <PenLine size={13} />}
          {saving ? 'Saving…' : 'Save entry'}
        </button>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--green)' }}>
            <Check size={13} /> Journaled today
          </span>
        )}
      </div>
    </div>
  )
}
