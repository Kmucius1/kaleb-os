import { supabase } from "@/lib/supabase";
import { blockCountsByDayType, dayTypeOf, dowOfDateStr } from "@/lib/schedule";

export const dynamic = "force-dynamic";

// Aggregates for the Week/Month views: which days have events, and each day's
// adherence % (check-offs / that day-type's block count). ?from=&to= (ET dates).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) return Response.json({ error: "from and to required" }, { status: 400 });

  try {
    const [eventsRes, compRes, blockCounts] = await Promise.all([
      supabase.from("schedule_events").select("event_date,title,start_min").gte("event_date", from).lte("event_date", to).order("start_min", { nullsFirst: true }),
      supabase.from("completions").select("done_date").eq("ref_type", "block").gte("done_date", from).lte("done_date", to),
      blockCountsByDayType(),
    ]);

    const eventsByDate: Record<string, { title: string; start_min: number | null }[]> = {};
    for (const e of eventsRes.data ?? []) {
      const d = (e as any).event_date as string;
      (eventsByDate[d] ??= []).push({ title: (e as any).title, start_min: (e as any).start_min });
    }
    const doneByDate: Record<string, number> = {};
    for (const c of compRes.data ?? []) {
      const d = (c as any).done_date as string;
      doneByDate[d] = (doneByDate[d] ?? 0) + 1;
    }
    // Adherence % per date that has any check-offs.
    const adherence: Record<string, number> = {};
    for (const [d, n] of Object.entries(doneByDate)) {
      const denom = blockCounts[dayTypeOf(dowOfDateStr(d))] || 0;
      adherence[d] = denom ? Math.round((n / denom) * 100) : 0;
    }
    return Response.json({ eventsByDate, adherence, blockCounts });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
