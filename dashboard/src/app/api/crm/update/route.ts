import { crmUpdate } from "@/lib/dryp-crm";

// POST /api/crm/update  { table: 'leads'|'accounts', id, patch }
// Whitelisted edit of DRYP CRM records from Kaleb OS.
const ALLOWED: Record<string, string[]> = {
  leads: ["stage", "next_action", "estimated_value", "notes", "close_probability"],
  accounts: ["health_status", "is_active", "monthly_retainer", "notes"],
};

export async function POST(request: Request) {
  try {
    const { table, id, patch } = await request.json().catch(() => ({}));
    if (!ALLOWED[table]) return Response.json({ error: "invalid table" }, { status: 400 });
    if (!id || !patch) return Response.json({ error: "id and patch required" }, { status: 400 });
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([k]) => ALLOWED[table].includes(k))
    );
    if (!Object.keys(clean).length) return Response.json({ error: "no editable fields" }, { status: 400 });
    const data = await crmUpdate(table, id, clean);
    return Response.json({ ok: true, data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
