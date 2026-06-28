import { cookies } from 'next/headers'

// POST /api/login  { username, password } -> sets httpOnly session cookie
export async function POST(request: Request) {
  const { username, password } = await request.json().catch(() => ({}))
  const user = process.env.DASH_USER || 'kaleb'
  const pass = process.env.DASH_PASSWORD
  const token = process.env.SESSION_TOKEN
  if (!pass || !token) return Response.json({ error: 'Auth not configured' }, { status: 500 })

  if (username === user && password === pass) {
    const jar = await cookies()
    jar.set('kos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'Invalid username or password' }, { status: 401 })
}
