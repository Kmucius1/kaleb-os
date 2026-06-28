import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Session gate: unauthenticated requests are redirected to the branded /login page.
// Active only when SESSION_TOKEN is set (so local dev stays open).
export function proxy(request: NextRequest) {
  const token = process.env.SESSION_TOKEN
  if (!token) return NextResponse.next()

  const { pathname } = request.nextUrl
  // Always allow the login screen, its API, and cron routes (cron self-auths with CRON_SECRET).
  if (pathname === '/login' || pathname === '/api/login' || pathname.startsWith('/api/cron/')) {
    return NextResponse.next()
  }

  if (request.cookies.get('kos_session')?.value === token) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = pathname && pathname !== '/' ? `?from=${encodeURIComponent(pathname)}` : ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
