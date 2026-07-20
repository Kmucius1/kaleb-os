// Tools the "Ask Kaleb OS" voice/chat assistant can call (read your data + act).
import { supabase } from "./supabase";
import { supabaseDryp } from "./supabaseDryp";
import { supabaseLedger } from "./supabaseLedger";
import { logIdea, logContentIdea, addJournal, addTask, logTrade, logProject, updateClient, draftMessage, getToday, remember, upsertEndeavor } from "./kalebos-actions";
import { getTradingSnapshot } from "./tradeprint";
import { getProjects } from "./github";
import { getTodaySchedule, fmtClock } from "./schedule";

// Persona + what Kaleb OS knows about Kaleb — injected into the assistant's system prompt.
export async function getContext(): Promise<{ persona: string; profile: string[] }> {
  const [{ data: cfg }, { data: mems }] = await Promise.all([
    supabase.from("kalebos_config").select("value").eq("key", "persona").maybeSingle(),
    supabase.from("memories").select("content").contains("tags", ["about-kaleb"]).order("priority", { ascending: false }).limit(12),
  ]);
  return { persona: cfg?.value ?? "", profile: (mems ?? []).map(m => m.content as string) };
}

// OpenAI/OpenRouter-style tool definitions.
export const TOOLS = [
  { type: "function", function: { name: "get_revenue", description: "DRYP revenue/P&L (cash received). period: week|month|all.", parameters: { type: "object", properties: { period: { type: "string", enum: ["week", "month", "all"] } } } } },
  { type: "function", function: { name: "get_clients", description: "Active DRYP clients (health, retainer) + open leads.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_today", description: "Today's snapshot: content ideas, open tasks, drafted scripts, clients, leads.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "search_emails", description: "Search Kaleb's captured emails (Gmail) by keyword/person to understand context before drafting.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "draft_email", description: "Draft an email (goes to approval queue, never auto-sends).", parameters: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "body"] } } },
  { type: "function", function: { name: "log_idea", description: "Save a general idea/thought Kaleb mentions.", parameters: { type: "object", properties: { idea: { type: "string" }, category: { type: "string", enum: ["content", "business", "trading", "personal"] } }, required: ["idea"] } } },
  { type: "function", function: { name: "log_content_idea", description: "Save a CONTENT idea for a brand (brand = me | ai | trading).", parameters: { type: "object", properties: { brand: { type: "string" }, hook: { type: "string" }, platform: { type: "string", enum: ["reels", "linkedin", "x", "youtube"] } }, required: ["brand", "hook"] } } },
  { type: "function", function: { name: "add_journal", description: "Log a meditation / reflection / how Kaleb is feeling.", parameters: { type: "object", properties: { content: { type: "string" }, kind: { type: "string", enum: ["meditation", "reflection", "gratitude", "note"] } }, required: ["content"] } } },
  { type: "function", function: { name: "add_task", description: "Add a to-do/reminder/follow-up.", parameters: { type: "object", properties: { title: { type: "string" }, deadline: { type: "string" } }, required: ["title"] } } },
  { type: "function", function: { name: "log_trade", description: "Log a trade Kaleb describes (the spoken process/transcript).", parameters: { type: "object", properties: { transcript: { type: "string" }, symbol: { type: "string" }, side: { type: "string", enum: ["long", "short"] }, pnl: { type: "number" }, outcome: { type: "string", enum: ["win", "loss", "breakeven"] }, notes: { type: "string" } }, required: ["transcript"] } } },
  { type: "function", function: { name: "log_project", description: "Record a project update (e.g. building TradePrint, Kaleb OS). Creates the project if new.", parameters: { type: "object", properties: { name: { type: "string" }, note: { type: "string" } }, required: ["name", "note"] } } },
  { type: "function", function: { name: "log_endeavor", description: "Record/update one of Kaleb's PERSONAL income streams (a 'side hustle' / venture outside the agency, e.g. trading, Ka1eb.ai, an app) and its income. Shows on the Personal Business tab. Use when he says how much an endeavor made (e.g. 'trading made $2k this month', 'add an endeavor: Ka1eb.ai $500/mo'). Matches an existing one by name and updates it. revenue_mtd = this month's income, revenue_total = all-time.", parameters: { type: "object", properties: { name: { type: "string" }, category: { type: "string" }, revenue_mtd: { type: "number" }, revenue_total: { type: "number" }, status: { type: "string", enum: ["active", "paused", "inactive"] }, description: { type: "string" } }, required: ["name"] } } },
  { type: "function", function: { name: "update_client", description: "Update a DRYP client by name: health, lead stage, and/or a note.", parameters: { type: "object", properties: { name: { type: "string" }, health: { type: "string" }, lead_stage: { type: "string" }, note: { type: "string" } }, required: ["name"] } } },
  { type: "function", function: { name: "remember", description: "Save a lasting fact about Kaleb (a preference, how he works, something he likes/dislikes, his goals) so you know him better over time.", parameters: { type: "object", properties: { fact: { type: "string" } }, required: ["fact"] } } },
  { type: "function", function: { name: "get_trading", description: "Kaleb's latest trading journal + psychology from TradePrint (readiness, discipline streak, reflections, rule violations). Use for trading-mindset/discipline questions.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "set_reminder", description: "Set a time-based reminder that pushes to Kaleb's phone. Provide minutes_from_now for relative times ('in 30 min', 'in 2 hours'), or due_at as an absolute ISO 8601 timestamp. Use add_task instead for untimed to-dos.", parameters: { type: "object", properties: { message: { type: "string" }, minutes_from_now: { type: "number" }, due_at: { type: "string" } }, required: ["message"] } } },
  { type: "function", function: { name: "log_mood", description: "Record how Kaleb is feeling right now (mindset tracking). mood like great|good|ok|low|stressed|tired; score 1-5.", parameters: { type: "object", properties: { mood: { type: "string" }, score: { type: "number" }, note: { type: "string" }, context: { type: "string" } }, required: ["mood"] } } },
  { type: "function", function: { name: "set_checkin_times", description: "Change Kaleb's daily notification times. kind='meditation' or 'journal'. times = array of 'HH:MM' (24h, ET). Replaces that kind's whole schedule.", parameters: { type: "object", properties: { kind: { type: "string", enum: ["meditation", "journal"] }, times: { type: "array", items: { type: "string" } } }, required: ["kind", "times"] } } },
  { type: "function", function: { name: "complete_task", description: "Mark a task done (matches by title). status defaults to completed; can also be 'cancelled' or 'in_progress'.", parameters: { type: "object", properties: { title: { type: "string" }, status: { type: "string", enum: ["completed", "cancelled", "in_progress"] } }, required: ["title"] } } },
  { type: "function", function: { name: "add_goal", description: "Create a goal.", parameters: { type: "object", properties: { title: { type: "string" }, target_date: { type: "string" } }, required: ["title"] } } },
  { type: "function", function: { name: "update_project_status", description: "Set a project's status (matches by name).", parameters: { type: "object", properties: { name: { type: "string" }, status: { type: "string", enum: ["active", "completed", "paused"] } }, required: ["name", "status"] } } },
  { type: "function", function: { name: "get_projects", description: "Kaleb's GitHub project portfolio (all his repos) organized by what he's actively working on vs dormant. Use for 'what am I working on', 'which projects are stale', 'what have I not touched', portfolio/side-project questions. Shows last-push recency + his manual labels (working|live|shelved|idea).", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_schedule", description: "Kaleb's schedule for today — his structured daily rhythm (the six-pillar blocks) plus any one-off events, and which block he is in RIGHT NOW. Use for 'what's my day', 'what's next', 'when is X', 'am I on track', or any time/schedule question.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "add_event", description: "Add a one-off event to Kaleb's personal calendar. KalebOS IS his personal calendar (not Google) — when he mentions an appointment/meeting/plan tied to a date (e.g. 'dentist Thursday at 3', 'call with Mick tomorrow 2-3pm', 'flight Saturday'), add it. date = YYYY-MM-DD (ET). start/end = 24h 'HH:MM' (omit both for all-day). pillar optional (Spirit|Mind|Body|Money|Mission|Relationships).", parameters: { type: "object", properties: { title: { type: "string" }, date: { type: "string" }, start: { type: "string" }, end: { type: "string" }, location: { type: "string" }, note: { type: "string" }, pillar: { type: "string" } }, required: ["title", "date"] } } },
  { type: "function", function: { name: "tune_atlas", description: "Adjust how YOU (Atlas) behave going forward per Kaleb's instruction (e.g. 'be more concise', 'call me bro less'). Persists to your persona.", parameters: { type: "object", properties: { change: { type: "string" } }, required: ["change"] } } },
  { type: "function", function: { name: "update_setting", description: "Set any app config key/value (kalebos_config). Use for misc settings Kaleb asks to change.", parameters: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] } } },
] as const;

const money = (n: number) => "$" + Math.round(n).toLocaleString();

export async function execTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  // Never let one tool crash the whole chat / ingest: a thrown DB error here
  // becomes a result Atlas can recover from, so the rest of a capture still files.
  try {
    return await runTool(name, args);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_revenue": {
      const period = (args.period as string) || "all";
      const { data: pays } = await supabaseLedger.from("invoice_payments").select("amount,payment_date");
      const now = new Date();
      const inRange = (d: string) => {
        if (!d) return false;
        if (period === "all") return true;
        const dt = new Date(d);
        if (period === "month") return dt.getUTCFullYear() === now.getUTCFullYear() && dt.getUTCMonth() === now.getUTCMonth();
        return (now.getTime() - dt.getTime()) <= 7 * 864e5; // week
      };
      const total = (pays ?? []).filter(p => inRange(p.payment_date)).reduce((s, p) => s + Number(p.amount ?? 0), 0);
      const { data: inv } = await supabaseLedger.from("invoices").select("amount_invoiced,status");
      const outstanding = (inv ?? []).filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.amount_invoiced ?? 0), 0);
      return { period, cash_received: money(total), outstanding: money(outstanding) };
    }
    case "get_clients": {
      const [{ data: a }, { data: l }] = await Promise.all([
        supabaseDryp.from("accounts").select("business_name,is_active,health_status,monthly_retainer"),
        supabaseDryp.from("leads").select("business_name,stage,estimated_value"),
      ]);
      const active = (a ?? []).filter(x => x.is_active).map(x => ({ name: (x.business_name || "").trim(), health: x.health_status, retainer: x.monthly_retainer }));
      const openLeads = (l ?? []).filter(x => !["won", "lost", "completed"].includes(x.stage)).map(x => ({ name: (x.business_name || "").trim(), stage: x.stage, value: x.estimated_value }));
      return { active_clients: active, open_leads: openLeads };
    }
    case "get_today": return await getToday();
    case "search_emails": {
      const q = String(args.query || "");
      const { data } = await supabase.from("raw_captures").select("content_text,created_at,metadata")
        .eq("source", "gmail").ilike("content_text", `%${q}%`).order("created_at", { ascending: false }).limit(5);
      return (data ?? []).map(r => ({ when: r.created_at, snippet: (r.content_text || "").slice(0, 800), meta: r.metadata }));
    }
    case "draft_email": return await draftMessage({ channel: "email", to: String(args.to), body: `Subject: ${args.subject || "(none)"}\n\n${args.body}` });
    case "log_idea": return await logIdea({ idea: String(args.idea), category: args.category as string });
    case "log_content_idea": return await logContentIdea({ brand: String(args.brand), hook: String(args.hook), platform: args.platform as string });
    case "add_journal": return await addJournal({ content: String(args.content), kind: args.kind as string });
    case "add_task": return await addTask({ title: String(args.title), deadline: args.deadline as string });
    case "log_trade": return await logTrade({ transcript: String(args.transcript), symbol: args.symbol as string, side: args.side as string, pnl: args.pnl as number, outcome: args.outcome as string, notes: args.notes as string });
    case "log_project": return await logProject({ name: String(args.name), note: String(args.note) });
    case "log_endeavor": return await upsertEndeavor({ name: String(args.name), category: args.category as string, revenue_mtd: args.revenue_mtd as number, revenue_total: args.revenue_total as number, status: args.status as string, description: args.description as string });
    case "update_client": return await updateClient({ name: String(args.name), health: args.health as string, lead_stage: args.lead_stage as string, note: args.note as string });
    case "remember": return await remember({ fact: String(args.fact) });
    case "set_reminder": {
      const mins = typeof args.minutes_from_now === "number" ? args.minutes_from_now : null;
      let dueAt: Date;
      if (mins != null) dueAt = new Date(Date.now() + mins * 60000);
      else if (args.due_at) { dueAt = new Date(String(args.due_at)); if (isNaN(dueAt.getTime())) return { error: "couldn't parse due_at" }; }
      else return { error: "need minutes_from_now or due_at" };
      const { error } = await supabase.from("reminders").insert({ message: String(args.message), due_at: dueAt.toISOString(), source: "atlas" });
      return error ? { error: error.message } : { ok: true, due_at: dueAt.toISOString() };
    }
    case "log_mood": {
      const { error } = await supabase.from("mood_checkins").insert({
        mood: String(args.mood), score: typeof args.score === "number" ? args.score : null,
        note: args.note as string ?? null, context: args.context as string ?? null, source: "atlas",
      });
      return error ? { error: error.message } : { ok: true };
    }
    case "set_checkin_times": {
      const kind = String(args.kind);
      const times = (args.times as string[] ?? []).filter(t => /^\d{1,2}:\d{2}$/.test(t));
      if (!times.length) return { error: "no valid HH:MM times" };
      await supabase.from("notification_schedule").delete().eq("kind", kind);
      const isMed = kind === "meditation";
      const rows = times.map(t => ({
        kind, time_et: t, label: `${kind} ${t}`,
        title: isMed ? "🧘 Meditate" : "📝 How are you feeling?",
        body: isMed ? "Take a few minutes to sit and breathe." : "Quick check-in — log your mindset right now.",
        deep_link: isMed ? "/dashboard" : "/feeling", active: true,
      }));
      const { error } = await supabase.from("notification_schedule").insert(rows);
      return error ? { error: error.message } : { ok: true, kind, times };
    }
    case "complete_task": {
      const status = (args.status as string) || "completed";
      const { data, error } = await supabase.from("tasks").update({ status })
        .ilike("title", `%${String(args.title)}%`).select("id,title");
      return error ? { error: error.message } : { ok: true, updated: data?.length ?? 0, status };
    }
    case "add_goal": {
      const { error } = await supabase.from("goals").insert({
        title: String(args.title), status: "active", priority: 3,
        target_date: args.target_date ? String(args.target_date) : null,
      });
      return error ? { error: error.message } : { ok: true };
    }
    case "update_project_status": {
      const { data, error } = await supabase.from("projects").update({ status: String(args.status) })
        .ilike("name", `%${String(args.name)}%`).select("id,name");
      return error ? { error: error.message } : { ok: true, updated: data?.length ?? 0 };
    }
    case "get_projects": {
      const projects = await getProjects();
      return projects.map(p => ({
        name: p.name,
        status: p.status ?? p.activity,
        lastPush: `${p.daysSincePush}d ago`,
        private: p.isPrivate,
        language: p.language,
        description: p.description,
      }));
    }
    case "get_schedule": {
      const s = await getTodaySchedule();
      const fmt = (b: any) => ({ time: `${fmtClock(b.start_min)}–${fmtClock(b.end_min)}`, title: b.title, pillar: b.pillar, ...(b.theme ? { theme: b.theme } : {}), ...(b.identity ? { identity: b.identity } : {}) });
      return {
        dayType: s.dayType,
        now: fmtClock(s.nowMin),
        currentBlock: s.current ? fmt(s.current) : "transition / open",
        nextBlock: s.next ? fmt(s.next) : "end of day",
        blocks: s.blocks.map(fmt),
        events: s.events.map((e: any) => ({ time: e.start_min != null ? fmtClock(e.start_min) : "all day", title: e.title, location: e.location, note: e.note })),
      };
    }
    case "add_event": {
      const toMin = (t?: string): number | null => {
        if (!t) return null;
        const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
        if (!m) return null;
        return (Number(m[1]) % 24) * 60 + Number(m[2]);
      };
      const row = {
        title: String(args.title),
        event_date: String(args.date),
        start_min: toMin(args.start as string),
        end_min: toMin(args.end as string),
        location: (args.location as string) ?? null,
        note: (args.note as string) ?? null,
        pillar: (args.pillar as string) ?? null,
        source: "atlas",
      };
      const { data, error } = await supabase.from("schedule_events").insert(row).select().single();
      return error ? { error: error.message } : { ok: true, event: { title: data.title, date: data.event_date, at: data.start_min != null ? fmtClock(data.start_min) : "all day" } };
    }
    case "tune_atlas": {
      const { data: cfg } = await supabase.from("kalebos_config").select("value").eq("key", "persona").maybeSingle();
      const next = `${cfg?.value ?? ""}\n\n[Kaleb's tuning]: ${String(args.change)}`.trim();
      const { error } = await supabase.from("kalebos_config").upsert({ key: "persona", value: next }, { onConflict: "key" });
      return error ? { error: error.message } : { ok: true };
    }
    case "update_setting": {
      const { error } = await supabase.from("kalebos_config").upsert({ key: String(args.key), value: String(args.value) }, { onConflict: "key" });
      return error ? { error: error.message } : { ok: true };
    }
    case "get_trading": {
      try { return await getTradingSnapshot(); }
      catch { return { error: "TradePrint not connected yet (needs its service key)." }; }
    }
    default: return { error: `unknown tool ${name}` };
  }
}
