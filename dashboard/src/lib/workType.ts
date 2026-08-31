// Classifying DRYP work by leverage.
//
//   ceo         only he can do it — strategy, pricing, positioning, hiring,
//               partnerships, the decisions
//   builder     making the thing — code, systems, design, writing
//   management  running people and clients — meetings, follow-ups, reviews
//   admin       the pile that keeps the lights on
//
// The point is not tidiness. It is to make the admin and management piles
// visible enough to hand off, so the office day trends toward CEO and Builder
// across the season.
//
// Deliberately deterministic rather than an LLM call: 424 open tasks would be
// expensive to classify and impossible to reproduce, and a rule you can read is
// a rule you can argue with. Anything it cannot place stays null rather than
// being guessed into a bucket.

export const WORK_TYPES = ['ceo', 'builder', 'management', 'admin'] as const
export type WorkType = (typeof WORK_TYPES)[number]

export const WORK_TYPE_META: Record<WorkType, { label: string; of: string; color: string }> = {
  ceo: { label: 'CEO', of: 'Strategy, pricing, positioning, hiring, partnerships, decisions', color: '#fbbf24' },
  builder: { label: 'Builder', of: 'Building the thing — code, systems, design, writing', color: '#a855f7' },
  management: { label: 'Management', of: 'Clients, meetings, follow-ups, reviews, coordination', color: '#60a5fa' },
  admin: { label: 'Admin', of: 'Invoices, filing, scheduling, the recurring upkeep', color: '#63636f' },
}

// Ordered by specificity: the first list that matches wins, so "invoice the
// client" is admin rather than management.
//
// Words are matched as stems with common inflections, because `\binvoice\b`
// does not match "invoices" — the word boundary fails before the s. That single
// omission left a third of the real task list unclassified.
const INFLECT = '(?:s|es|ing|ed|d|ment|ments)?'
const words = (...stems: string[]) => new RegExp(`\\b(?:${stems.join('|')})${INFLECT}\\b`, 'i')

const RULES: { type: WorkType; patterns: RegExp[] }[] = [
  {
    type: 'admin',
    patterns: [
      words('invoice', 'receipt', 'expense', 'reimburse', 'bookkeep', 'payroll', 'tax', 'renew', 'subscription', 'billing'),
      /\bw-?9\b|\b1099\b/i,
      words('file', 'filing', 'upload', 'organise', 'organize', 'archive', 'rename', 'backup'),
      words('password', 'credential', 'licence', 'license', 'seat'),
      /\b(book|schedule|reschedule|confirm)\w*\s+(a |the )?(call|meeting|appointment|flight|room)\b/i,
      words('paperwork', 'admin', 'spreadsheet', 'data entry'),
    ],
  },
  {
    type: 'ceo',
    patterns: [
      words('strategy', 'strategic', 'vision', 'roadmap', 'position', 'positioning'),
      words('pricing', 'price', 'offer', 'packaging', 'margin'),
      /\bprofitab\w*/i, /\brate card\b/i,
      words('hire', 'hiring', 'recruit', 'interview'),
      words('partnership', 'acquisition', 'investor'),
      /\bpartner with\b|\bjoint venture\b|\bfundrais\w*/i,
      words('decide', 'decision'),
      /\b(choose between|figure out whether|should we)\b/i,
      /\b(quarterly|annual)\s+(plan|review|goal)\w*/i,
    ],
  },
  {
    type: 'management',
    patterns: [
      words('meet', 'meeting', 'call', 'zoom', 'sync', 'standup', 'checkin'),
      /\bstand ?up\b|\bcheck ?in\b|\b1:1\b|\bone on one\b/i,
      /\bfollow ?up\w*/i,
      words('chase', 'nudge', 'remind', 'email'),
      /\b(reply|respond) to\b/i,
      words('client', 'customer', 'account', 'stakeholder', 'vendor', 'contractor'),
      words('review', 'approve', 'feedback', 'delegate', 'assign', 'handoff'),
      /\bsign ?off\b/i,
      words('proposal', 'scope', 'contract', 'quote', 'pitch'),
      /\bsow\b/i,
      words('status', 'update', 'report', 'recap'),
    ],
  },
  {
    type: 'builder',
    patterns: [
      words('build', 'ship', 'code', 'implement', 'develop', 'program', 'refactor'),
      /\bmigrat\w*|\bautomat\w*|\bintegrat\w*/i,
      words('fix', 'bug', 'debug', 'patch', 'repair', 'error'),
      /\bbroken\b/i,
      words('design', 'mockup', 'wireframe', 'prototype', 'layout'),
      /\bui\b|\bux\b/i,
      words('write', 'draft', 'script', 'copy', 'article'),
      /\bcontent\b/i,
      words('deploy', 'launch', 'release', 'test', 'configure', 'install'),
      /\bapi\b|\bdatabase\b|\bschema\b|\bset ?up\b|\bwire up\b/i,
    ],
  },
]

// Areas that decide it when the words do not.
const AREA_DEFAULT: Record<string, WorkType> = {
  admin: 'admin',
  clients: 'management',
  ehm: 'management',
  linkdup: 'management',
  'kaleb-os': 'builder',
  commerce: 'builder',
}

/**
 * Best guess at what kind of work this is, or null.
 *
 * Null is a real answer. A task the rules cannot place is better left
 * unclassified than pushed into a bucket that will then be counted, charted
 * and acted on.
 */
export function classifyWorkType(task: { title?: string | null; description?: string | null; area?: string | null }): WorkType | null {
  const text = `${task.title ?? ''} ${task.description ?? ''}`.trim()
  if (text) {
    for (const rule of RULES) {
      if (rule.patterns.some(p => p.test(text))) return rule.type
    }
  }
  const area = (task.area ?? '').toLowerCase()
  return AREA_DEFAULT[area] ?? null
}

/**
 * Could someone else do this?
 *
 * Admin always, management usually. Builder work is delegable in principle but
 * is where his leverage actually is right now, so it is not flagged. CEO work
 * is the definition of not delegable — if it were, it would not be CEO work.
 */
export function isDelegable(type: WorkType | null): boolean | null {
  if (type === null) return null
  return type === 'admin' || type === 'management'
}

/** How the office day splits, and how much of it could be handed off. */
export function leverageOf(tasks: { work_type: string | null }[]) {
  const counts: Record<string, number> = { ceo: 0, builder: 0, management: 0, admin: 0, unclassified: 0 }
  for (const t of tasks) {
    const k = t.work_type && (WORK_TYPES as readonly string[]).includes(t.work_type) ? t.work_type : 'unclassified'
    counts[k]++
  }
  const classified = tasks.length - counts.unclassified
  const delegable = counts.admin + counts.management
  return {
    counts,
    classified,
    delegable,
    /** Share of classified work that is high-leverage. */
    leveragePct: classified ? Math.round(((counts.ceo + counts.builder) / classified) * 100) : null,
    delegablePct: classified ? Math.round((delegable / classified) * 100) : null,
  }
}
