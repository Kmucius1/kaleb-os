import { supabase } from '@/lib/supabase'
import { bucketOf } from '@/lib/tasks'
import TaskBoard, { type Task } from '@/components/TaskBoard'

export const revalidate = 60

export default async function TasksPage() {
  // Only what's open. Completed and dismissed tasks are history, and history
  // does not belong in a list whose job is "what do I do next".
  const { data, error } = await supabase
    .from('tasks')
    .select('id,title,description,status,priority,owner,area,source,due_date,triaged_at,created_at')
    .in('status', ['pending', 'in_progress'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  const open: Task[] = data ?? []
  const now = open.filter(t => bucketOf(t) === 'now').length
  const mine = open.filter(t => (t.owner ?? 'kaleb') === 'kaleb').length

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      <div className="rise rise-1" style={{ marginBottom: 18 }}>
        <h1 className="h-hero" style={{ margin: 0 }}>Tasks</h1>
        <p style={{ color: 'var(--foreground-2)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }}>
          {open.length === 0
            ? 'Clear.'
            : <>{now} to do now — {mine} of {open.length} open are yours.</>}
        </p>
      </div>

      {error && (
        <div className="card2 rise rise-2" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 16, borderColor: 'var(--red)' }}>
          Error: {error.message}
        </div>
      )}

      <TaskBoard tasks={open} />
    </div>
  )
}
