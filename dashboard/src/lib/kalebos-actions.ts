// Semantic actions the Kaleb OS MCP exposes to Claude.
// Each maps a spoken/typed intent to the right table(s). Used by /api/mcp.
import { supabase } from "./supabase";
import { supabaseDryp } from "./supabaseDryp";
import { TASK_AREAS, dedupeKey } from "./tasks";

// ── capture ──────────────────────────────────────────────────────────
const IDEA_TYPES = ["content", "business", "trading", "personal"];
export async function logIdea(input: { idea: string; category?: string }) {
  const type = IDEA_TYPES.includes(input.category ?? "") ? input.category : "personal";
  const { data, error } = await supabase.from("ideas")
    .insert({ title: input.idea.slice(0, 200), content: input.idea, type, status: "raw" })
    .select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "ideas" };
}

export async function logContentIdea(input: { brand: string; hook: string; platform?: string }) {
  const { data: brand } = await supabase.from("brands").select("id").eq("slug", input.brand).maybeSingle();
  if (!brand) throw new Error(`unknown brand '${input.brand}' (use me|ai|trading or a client slug)`);
  const { data, error } = await supabase.from("content_ideas")
    .insert({ brand_id: brand.id, title: input.hook.slice(0, 200), angle: input.hook,
      platform: input.platform ?? "reels", hook_options: [input.hook], status: "idea", created_by: "claude" })
    .select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "content_ideas" };
}

export async function remember(input: { fact: string; permanent?: boolean }) {
  const { data, error } = await supabase.from("memories")
    .insert({ content: input.fact, type: input.permanent === false ? "temporary" : "permanent", tags: ["about-kaleb"] })
    .select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "remembered about Kaleb" };
}

export async function addJournal(input: { content: string; kind?: string }) {
  const { data, error } = await supabase.from("journal")
    .insert({ content: input.content, kind: input.kind ?? "reflection" }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "journal" };
}

export async function addTask(input: {
  title: string; deadline?: string; category?: string;
  owner?: string; priority?: number; area?: string; source?: string;
}) {
  // due_date is a DATE column — only store a real YYYY-MM-DD. Atlas sometimes
  // passes a relative phrase ("this week"); keep that out of the column (and in
  // the title so it isn't lost) rather than erroring on the whole capture.
  const raw = input.deadline?.trim();
  const iso = raw && !isNaN(Date.parse(raw)) ? new Date(raw).toISOString().slice(0, 10) : null;
  const title = raw && !iso ? `${input.title} (${raw})` : input.title;

  // Triage is set at write time, not left for later. A task with no owner and no
  // priority is indistinguishable from every other task, which is how the list
  // got to 306 rows of undifferentiated pending.
  const owner = input.owner === "team" || input.owner === "other" ? input.owner : "kaleb";
  const priority = Math.min(10, Math.max(1, Math.round(Number(input.priority) || 5)));
  const area = (TASK_AREAS as readonly string[]).includes(input.area ?? "") ? input.area : null;
  const key = dedupeKey(title);

  // One recording gets chunked into sections filed by separate passes, and the
  // same commitment gets restated across them. Match an open task with the same
  // normalized title and keep the stronger priority instead of adding a row.
  const { data: dupe } = await supabase.from("tasks")
    .select("id,priority").eq("dedupe_key", key).eq("status", "pending").limit(1).maybeSingle();
  if (dupe) {
    if (priority > (dupe.priority ?? 0)) {
      await supabase.from("tasks").update({ priority, updated_at: new Date().toISOString() }).eq("id", dupe.id);
    }
    return { id: dupe.id, saved: "tasks", duplicate_of: dupe.id, due_date: iso };
  }

  const { data, error } = await supabase.from("tasks")
    .insert({
      title, due_date: iso, status: "pending",
      owner, priority, area, source: input.source ?? null,
      dedupe_key: key, triaged_at: new Date().toISOString(),
    })
    .select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "tasks", owner, priority, due_date: iso };
}

// A personal income stream / venture (shows on the Personal "Business" tab).
// Matches an existing endeavor by name (case-insensitive) and updates it;
// otherwise creates it. Only provided fields are written.
export async function upsertEndeavor(input: {
  name: string; category?: string; revenue_mtd?: number; revenue_total?: number; status?: string; description?: string;
}) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.category != null) patch.category = input.category;
  if (input.revenue_mtd != null) patch.revenue_mtd = input.revenue_mtd;
  if (input.revenue_total != null) patch.revenue_total = input.revenue_total;
  if (input.status != null) patch.status = input.status;
  if (input.description != null) patch.description = input.description;

  const { data: existing } = await supabase.from("side_hustles")
    .select("id").ilike("name", input.name.trim()).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("side_hustles").update(patch).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id, saved: "side_hustles", updated: true };
  }
  const { data, error } = await supabase.from("side_hustles")
    .insert({ name: input.name.trim(), status: input.status ?? "active", ...patch })
    .select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "side_hustles", created: true };
}

export async function logTrade(input: {
  transcript: string; symbol?: string; side?: string; pnl?: number; outcome?: string; notes?: string;
}) {
  const { data, error } = await supabase.from("trades").insert({
    transcript: input.transcript, symbol: input.symbol ?? null, side: input.side ?? null,
    pnl: input.pnl ?? null, outcome: input.outcome ?? null, notes: input.notes ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "trades", note: "Attach before/after screenshots from the Trades page." };
}

export async function logProject(input: { name: string; note: string; status?: string }) {
  // upsert the project by name, and store the update as a tagged memory
  const { data: existing } = await supabase.from("projects").select("id").ilike("name", input.name).maybeSingle();
  if (!existing) {
    await supabase.from("projects").insert({ name: input.name, status: input.status ?? "active", description: input.note });
  } else if (input.status) {
    await supabase.from("projects").update({ status: input.status }).eq("id", existing.id);
  }
  await supabase.from("memories").insert({
    content: `[project: ${input.name}] ${input.note}`, type: "permanent", tags: [input.name, "project"],
  });
  return { saved: "projects+memories", project: input.name };
}

// ── CRM ──────────────────────────────────────────────────────────────
export async function updateClient(input: { name: string; health?: string; lead_stage?: string; note?: string }) {
  const out: Record<string, unknown> = {};
  if (input.health) {
    const { data } = await supabaseDryp.from("accounts").update({ health_status: input.health })
      .ilike("business_name", `%${input.name}%`).select("id");
    out.accounts_updated = (data ?? []).length;
  }
  if (input.lead_stage) {
    const { data } = await supabaseDryp.from("leads").update({ stage: input.lead_stage })
      .ilike("business_name", `%${input.name}%`).select("id");
    out.leads_updated = (data ?? []).length;
  }
  if (input.note) {
    await supabase.from("memories").insert({
      content: `[client: ${input.name}] ${input.note}`, type: "temporary", tags: [input.name, "client"],
    });
    out.note_saved = true;
  }
  return out;
}

// ── drafts (NEVER auto-send — locked decision: emails need approval) ──
export async function draftMessage(input: { channel: string; to: string; body: string }) {
  const { data, error } = await supabase.from("agent_actions").insert({
    action_type: "send_message", status: "pending_approval",
    description: `Draft ${input.channel} to ${input.to} — awaiting approval`,
    payload: { channel: input.channel, to: input.to, body: input.body },
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, status: "awaiting_approval", note: "Saved to approval queue. NOT sent." };
}

// ── read: morning context ────────────────────────────────────────────
export async function getToday() {
  const [{ data: ideas }, { data: tasks }, { count: scripts }] = await Promise.all([
    supabase.from("content_ideas").select("title,angle").eq("status", "idea").order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("title").eq("status", "pending").limit(8),
    supabase.from("content_scripts").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  let clients = 0, openLeads = 0;
  try {
    const [{ data: a }, { data: l }] = await Promise.all([
      supabaseDryp.from("accounts").select("is_active"),
      supabaseDryp.from("leads").select("stage"),
    ]);
    clients = (a ?? []).filter(x => x.is_active).length;
    openLeads = (l ?? []).filter(x => !["won", "lost", "completed"].includes(x.stage)).length;
  } catch { /* crm optional */ }
  return {
    content_ideas: (ideas ?? []).map(i => i.angle || i.title),
    open_tasks: (tasks ?? []).map(t => t.title),
    drafted_scripts: scripts ?? 0, active_clients: clients, open_leads: openLeads,
  };
}
