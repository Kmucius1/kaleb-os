// Which line the notification says, and how it is chosen.
//
// Pure on purpose: notify.ts stays testable, and the picker's one real
// property — same day, same line; different day, different line — can be
// asserted without a database.

export const SLOTS = ["morning", "trading", "gym", "content", "evening", "sleep"] as const;
export type Slot = (typeof SLOTS)[number];

/** slot → the lines available for it. */
export type Bank = Partial<Record<Slot, string[]>>;

/**
 * Which rhythm block earns which voice.
 *
 * Only the blocks the 90-day system is actually measured by get a line. The
 * commute and dinner do not need encouragement, and a motivational push on
 * every block would train him to ignore all of them.
 */
export function slotForBlock(key: string): Slot | null {
  switch (key) {
    case "wake":
      return "morning";
    case "trading":
    case "trading-review":
      return "trading";
    case "gym":
      return "gym";
    case "content":
    case "content-batch":
      return "content";
    case "meditation-pm":
      return "evening";
    case "sleep":
      return "sleep";
    default:
      // Deliberately silent. meditation-am would repeat the morning line the
      // wake push carried ten minutes earlier, and journal-pm would repeat the
      // sleep line lights-out is about to carry. One slot, one push, one line a
      // day — three notifications saying the same sentence at bedtime is how a
      // system teaches you to swipe it away.
      return null;
  }
}

/** FNV-1a. Small, stable, and identical on every runtime — which matters,
 *  because the picked line must not change between two cron ticks. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The line for this slot on this date.
 *
 * Deterministic from (date, slot): a second tick on the same day cannot
 * contradict the first, and consecutive days rotate. Returns null when the
 * slot has no lines, so the caller can fall back to the block's own detail
 * rather than sending an empty notification.
 */
export function pickMessage(bank: Bank, slot: Slot, dateStr: string): string | null {
  const lines = bank[slot];
  if (!lines || lines.length === 0) return null;
  return lines[hash(`${dateStr}:${slot}`) % lines.length];
}
