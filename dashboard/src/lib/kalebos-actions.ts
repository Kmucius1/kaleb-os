// Semantic actions the Kaleb OS MCP exposes to Claude.
// Each maps a spoken/typed intent to the right table(s). Used by /api/mcp.
import { supabase } from "./supabase";
import { supabaseDryp } from "./supabaseDryp";

// ── capture ──────────────────────────────────────────────────────────
export async function logIdea(input: { idea: string; category?: string }) {
  const { data, error } = await supabase.from("ideas")
    .insert({ title: input.idea.slice(0, 200), content: input.idea, category: input.category ?? null })
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

export async function addTask(input: { title: string; deadline?: string; category?: string }) {
  const { data, error } = await supabase.from("tasks")
    .insert({ title: input.title, deadline: input.deadline ?? null, category: input.category ?? null,
      status: "todo", created_by: "claude" }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, saved: "tasks" };
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
    await supabase.from("projects").insert({ name: input.name, status: input.status ?? "active", category: "business" });
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
    action_type: "send_message", risk_tier: "medium", status: "awaiting_approval",
    payload: { channel: input.channel, to: input.to, body: input.body },
    reasoning: "Drafted from Claude voice/chat — awaiting Kaleb's approval before sending.",
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data?.id, status: "awaiting_approval", note: "Saved to approval queue. NOT sent." };
}

// ── read: morning context ────────────────────────────────────────────
export async function getToday() {
  const [{ data: ideas }, { data: tasks }, { count: scripts }] = await Promise.all([
    supabase.from("content_ideas").select("title,angle").eq("status", "idea").order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("title").eq("status", "todo").limit(8),
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
