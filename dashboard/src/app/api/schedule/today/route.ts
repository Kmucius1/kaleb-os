import { getTodaySchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

// Today's blocks + events for the live home timeline. The client recomputes
// "now" locally every second; it polls this only to pick up schedule edits and
// the day-type rollover at midnight without a full app restart.
export async function GET() {
  try {
    const s = await getTodaySchedule();
    return Response.json({ blocks: s.blocks, events: s.events, dateStr: s.dateStr });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
