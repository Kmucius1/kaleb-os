import { cookies } from 'next/headers'

// Kaleb's reality has two top-level spaces:
//  - personal : Kaleb + his solo missions/ventures (me, Ka1eb.ai, trading, future projects)
//  - dryp     : the agency/company (clients, client content, pipeline, agency revenue)
export type Space = 'personal' | 'dryp'

export const SPACE_COOKIE = 'kos_space'

export const SPACE_META: Record<Space, { label: string; color: string; tagline: string }> = {
  personal: { label: 'Personal', color: '#6366f1', tagline: 'You + your missions' },
  dryp: { label: 'DRYP', color: '#14b8a6', tagline: 'The agency' },
}

// Read the active space from the cookie (defaults to personal).
export async function getSpace(): Promise<Space> {
  const store = await cookies()
  return store.get(SPACE_COOKIE)?.value === 'dryp' ? 'dryp' : 'personal'
}

// A content brand belongs to DRYP only if it's a client; everything else
// (personal brand, niche ventures like Ka1eb.ai / trading) is personal.
export function brandSpace(kind: string | null | undefined): Space {
  return kind === 'client' ? 'dryp' : 'personal'
}
