import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Session gate: unauthenticated requests are redirected to the branded /login page.
// Active only when SESSION_TOKEN is set (so local dev stays open).
export function proxy(request: NextRequest) {
  const token = process.env.SESSION_TOKEN
  if (!token) return NextResponse.next()

  const { pathname } = request.nextUrl
  // Always allow: login screen + API, cron (self-auths with CRON_SECRET), MCP (self-auths with MCP_SECRET),
  // ingest (self-auths with INGEST_SECRET — the PLAUD auto-pipe posts here headlessly),
  // and public PWA assets (manifest/sw/icons) so the app can install + show its icon.
  if (
    pathname === '/login' || pathname === '/api/login' ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/ingest/') ||
    pathname === '/api/mcp' || pathname === '/api/sse' || pathname === '/api/message' ||
    pathname === '/manifest.webmanifest' || pathname === '/sw.js' ||
    pathname === '/apple-touch-icon.png' || pathname.startsWith('/icon')
  ) {
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
