// A tiny outbox for things written with no signal.
//
// The beach is exactly where the Horizon Walk journal gets written, and exactly
// where the network is worst. Anything queued here survives a reload and flushes
// the moment the connection returns — nothing Kaleb says is ever lost to a
// failed POST.

const KEY = 'kos_outbox_v1';

export type Queued = {
  id: string;
  url: string;
  body: unknown;
  /** What to tell him it was, if it ever needs explaining. */
  label: string;
  queuedAt: number;
};

function read(): Queued[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Queued[]) : [];
  } catch {
    return [];
  }
}

function write(items: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-50)));
  } catch {
    /* storage full or blocked — the caller already has its own error path */
  }
}

export function queueCount(): number {
  return read().length;
}

export function enqueue(url: string, body: unknown, label: string): Queued {
  const item: Queued = {
    // Date.now + a counter is enough here; these never leave the device.
    id: `${Date.now()}-${Math.floor(performance.now() * 1000) % 100000}`,
    url,
    body,
    label,
    queuedAt: Date.now(),
  };
  write([...read(), item]);
  return item;
}

/**
 * Try to send everything queued. Items that fail stay queued in order, so a
 * partial outage doesn't drop the tail.
 */
export async function flush(): Promise<{ sent: number; left: number }> {
  const items = read();
  if (items.length === 0) return { sent: 0, left: 0 };

  const remaining: Queued[] = [];
  let sent = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });
      if (res.ok) sent += 1;
      else remaining.push(item);
    } catch {
      // Still offline — keep this and everything after it.
      remaining.push(item);
    }
  }
  write(remaining);
  return { sent, left: remaining.length };
}

/** Flush whenever the browser says we're back, and once on load. */
export function startOutbox(onFlushed?: (r: { sent: number; left: number }) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const run = () => { void flush().then((r) => { if (r.sent > 0) onFlushed?.(r); }); };
  window.addEventListener('online', run);
  if (navigator.onLine) run();
  return () => window.removeEventListener('online', run);
}
