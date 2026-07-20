import { getScheduleForDate } from "@/lib/schedule";

export const dynamic = "force-dynamic";

// Schedule + check-offs for one ET date. ?date=YYYY-MM-DD (defaults to today ET).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date")
    || new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  try {
    const s = await getScheduleForDate(date);
    return Response.json(s);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
