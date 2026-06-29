import type { Metadata, Viewport } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import TabBar from '@/components/TabBar'
import SpaceBar from '@/components/SpaceBar'
import RegisterSW from '@/components/RegisterSW'
import { supabase } from '@/lib/supabase'
import { getSpace } from '@/lib/space'

export const metadata: Metadata = {
  title: 'Kaleb OS',
  description: 'Personal AI Operating System',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Kaleb OS' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ count: approvalCount }, { count: taskCount }, space] = await Promise.all([
    supabase.from('agent_actions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    getSpace(),
  ])

  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100dvh', display: 'flex', flexDirection: 'row', margin: 0, padding: 0, overflow: 'hidden' }}>
        <RegisterSW />
        {/* Desktop: persistent left sidebar (hidden < 820px via CSS) */}
        <Sidebar approvalCount={approvalCount ?? 0} taskCount={taskCount ?? 0} />
        {/* Content column: space switch + scrollable page + (mobile) bottom tab bar.
            paddingTop clears the iPhone status bar (translucent PWA status bar). */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>
          {/* Personal ⇄ DRYP switch (hidden on chat home + login) */}
          <SpaceBar current={space} />
          <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
            {children}
          </main>
          {/* Mobile: iOS bottom tab bar (hidden >= 820px via CSS) */}
          <TabBar approvalCount={approvalCount ?? 0} taskCount={taskCount ?? 0} />
        </div>
      </body>
    </html>
  )
}
