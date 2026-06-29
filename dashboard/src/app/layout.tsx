import type { Metadata, Viewport } from 'next'
import './globals.css'
import TabBar from '@/components/TabBar'
import RegisterSW from '@/components/RegisterSW'
import { supabase } from '@/lib/supabase'

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
  const [{ count: approvalCount }, { count: taskCount }] = await Promise.all([
    supabase.from('agent_actions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100dvh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, overflow: 'hidden' }}>
        <RegisterSW />
        <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
          {children}
        </main>
        <TabBar approvalCount={approvalCount ?? 0} taskCount={taskCount ?? 0} />
      </body>
    </html>
  )
}
