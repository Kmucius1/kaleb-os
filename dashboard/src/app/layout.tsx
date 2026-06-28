import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'KalebOS',
  description: 'Personal AI Operating System',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ count: approvalCount }, { count: taskCount }] = await Promise.all([
    supabase.from('agent_actions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', display: 'flex', margin: 0, padding: 0, overflow: 'hidden' }}>
        <Sidebar approvalCount={approvalCount ?? 0} taskCount={taskCount ?? 0} />
        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </body>
    </html>
  )
}
