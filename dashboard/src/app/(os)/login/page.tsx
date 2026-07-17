'use client'
import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Login failed')
      const from = new URLSearchParams(window.location.search).get('from')
      window.location.href = from || '/'
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(1200px 600px at 50% -10%, rgba(99,102,241,0.18), transparent 60%), var(--background)',
      padding: 24,
    }}>
      <form onSubmit={submit} style={{
        width: '100%', maxWidth: 380,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        padding: '32px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.4s ease',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={15} color="#0a0b0f" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Kaleb OS</div>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 26 }}>
          Personal AI Operating System
        </div>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--foreground-2)', marginBottom: 6 }}>Username</label>
        <input
          value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username"
          style={inputStyle}
        />
        <label style={{ display: 'block', fontSize: 12, color: 'var(--foreground-2)', margin: '16px 0 6px' }}>Password</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
          style={inputStyle}
        />

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 14 }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', marginTop: 22, padding: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'linear-gradient(135deg, var(--accent), #4f46e5)', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? <Loader2 size={15} className="spin" /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--background)', color: 'var(--foreground)',
  border: '1px solid var(--border-2)', borderRadius: 10, padding: '11px 13px',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
