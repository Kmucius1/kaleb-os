'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, Loader2, Trash2, X } from 'lucide-react'
import { bandFor, BAND_LABEL, type ConfidenceBand } from '@/lib/fuel/estimate'

// Photograph → estimate → correct → confirm.
//
// The screen's job is to make the uncertainty impossible to miss. Totals carry
// "≈", every item shows how sure the model was, and the confirm button says
// what confirming means — because until it is pressed, none of this counts.

type Item = {
  id: string
  name: string
  qty: number | null
  unit: string | null
  calories: number
  protein_g: number
  confidence: number
  edited?: boolean
}
type Meal = {
  id: string
  status: 'estimated' | 'confirmed'
  confidence: number | null
  note: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  produce_servings: number
  photo_url?: string | null
  items: Item[]
}

const BAND_COLOR: Record<ConfidenceBand, string> = {
  high: 'var(--green)',
  medium: 'var(--yellow)',
  low: 'var(--red)',
}

export default function FuelCapture() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meal, setMeal] = useState<Meal | null>(null)
  const [edits, setEdits] = useState<Record<string, { qty?: number; calories?: number; protein_g?: number }>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError(null); setMeal(null); setEdits({}); setRemoved(new Set())
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/fuel/capture', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? 'That did not work.'); return }
      // The capture response carries estimate items without ids; re-read so
      // corrections have something to address.
      const fresh = await fetch(`/api/fuel/meal?id=${json.meal.id}`).then(r => r.json()).catch(() => null)
      setMeal(fresh?.meal ?? json.meal)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save(confirm: boolean) {
    if (!meal) return
    setBusy(true)
    try {
      const items = [
        ...Object.entries(edits).map(([id, patch]) => ({ id, ...patch })),
        ...[...removed].map(id => ({ id, remove: true })),
      ]
      const res = await fetch('/api/fuel/meal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meal.id, items, confirm }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? 'Could not save.'); return }
      if (confirm) { setMeal(null); router.refresh() }
      else { setMeal(json.meal); setEdits({}); setRemoved(new Set()) }
    } finally { setBusy(false) }
  }

  async function discard() {
    if (!meal) return
    setBusy(true)
    await fetch(`/api/fuel/meal?id=${meal.id}`, { method: 'DELETE' }).catch(() => {})
    setMeal(null); setBusy(false); router.refresh()
  }

  const live = meal?.items.filter(i => !removed.has(i.id)) ?? []
  const liveTotals = live.reduce(
    (t, i) => ({
      calories: t.calories + (edits[i.id]?.calories ?? i.calories),
      protein_g: t.protein_g + (edits[i.id]?.protein_g ?? i.protein_g),
    }),
    { calories: 0, protein_g: 0 },
  )

  if (!meal) {
    return (
      <div>
        <input
          ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={onPick} style={{ display: 'none' }} id="fuel-photo"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="card2"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '18px 16px', cursor: busy ? 'wait' : 'pointer',
            border: '1px dashed var(--border-2)', background: 'var(--surface)',
            color: 'var(--foreground)', fontSize: 15, fontWeight: 600,
          }}
        >
          {busy ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
          {busy ? 'Reading the plate…' : 'Photograph a meal'}
        </button>
        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  const band = bandFor(meal.confidence ?? 0)

  return (
    <section className="card2" style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>Estimate — not yet counted</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            ≈ {Math.round(liveTotals.calories / 10) * 10} kcal
          </div>
          <div style={{ fontSize: 13, color: 'var(--foreground-2)', marginTop: 2 }}>
            ≈ {Math.round(liveTotals.protein_g)}g protein · {live.length} item{live.length === 1 ? '' : 's'}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: BAND_COLOR[band], border: `1px solid ${BAND_COLOR[band]}`, borderRadius: 6,
          padding: '4px 8px', whiteSpace: 'nowrap',
        }}>{BAND_LABEL[band]}</span>
      </header>

      {meal.note && (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
          {meal.note}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {live.map(i => {
          const b = bandFor(i.confidence)
          const cal = edits[i.id]?.calories ?? i.calories
          return (
            <div key={i.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center',
              padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10,
              borderLeft: `2px solid ${BAND_COLOR[b]}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                  {i.qty !== null ? `${i.qty}${i.unit ? ` ${i.unit}` : ''} · ` : ''}{BAND_LABEL[b]}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number" inputMode="numeric" value={cal} min={0}
                  onChange={e => setEdits(p => ({ ...p, [i.id]: { ...p[i.id], calories: Number(e.target.value) } }))}
                  aria-label={`${i.name} calories`}
                  style={{
                    width: 62, textAlign: 'right', fontSize: 13, padding: '5px 6px',
                    background: 'var(--surface-3)', border: '1px solid var(--border)',
                    borderRadius: 7, color: 'var(--foreground)',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>kcal</span>
              </label>
              <button
                onClick={() => setRemoved(s => new Set(s).add(i.id))}
                aria-label={`Remove ${i.name}`}
                style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={() => save(true)} disabled={busy || live.length === 0}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '11px 14px', borderRadius: 10, border: 0, cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
          Looks right — log it
        </button>
        <button
          onClick={discard} disabled={busy}
          aria-label="Discard this meal"
          style={{
            padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--foreground-2)',
          }}
        >
          <X size={15} />
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '9px 0 0', lineHeight: 1.5 }}>
        These are estimates from a photograph, not measurements. Correct anything
        that looks off — nothing counts toward today until you log it.
      </p>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </section>
  )
}
