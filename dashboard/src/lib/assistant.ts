// Tools the "Ask Kaleb OS" voice/chat assistant can call (read your data + act).
import { supabase } from "./supabase";
import { supabaseDryp } from "./supabaseDryp";
import { supabaseLedger } from "./supabaseLedger";
import { logIdea, logContentIdea, addJournal, addTask, logTrade, logProject, updateClient, draftMessage, getToday, remember } from "./kalebos-actions";
import { getTradingSnapshot } from "./tradeprint";

// Persona + what Kaleb OS knows about Kaleb — injected into the assistant's system prompt.
export async function getContext(): Promise<{ persona: string; profile: string[] }> {
  const [{ data: cfg }, { data: mems }] = await Promise.all([
    supabase.from("kalebos_config").select("value").eq("key", "persona").maybeSingle(),
    supabase.from("memories").select("content").contains("tags", ["about-kaleb"]).limit(40),
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
  { type: "function", function: { name: "update_client", description: "Update a DRYP client by name: health, lead stage, and/or a note.", parameters: { type: "object", properties: { name: { type: "string" }, health: { type: "string" }, lead_stage: { type: "string" }, note: { type: "string" } }, required: ["name"] } } },
  { type: "function", function: { name: "remember", description: "Save a lasting fact about Kaleb (a preference, how he works, something he likes/dislikes, his goals) so you know him better over time.", parameters: { type: "object", properties: { fact: { type: "string" } }, required: ["fact"] } } },
  { type: "function", function: { name: "get_trading", description: "Kaleb's latest trading journal + psychology from TradePrint (readiness, discipline streak, reflections, rule violations). Use for trading-mindset/discipline questions.", parameters: { type: "object", properties: {} } } },
] as const;

const money = (n: number) => "$" + Math.round(n).toLocaleString();

export async function execTool(name: string, args: Record<string, unknown>): Promise<unknown> {
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
    case "update_client": return await updateClient({ name: String(args.name), health: args.health as string, lead_stage: args.lead_stage as string, note: args.note as string });
    case "remember": return await remember({ fact: String(args.fact) });
    case "get_trading": {
      try { return await getTradingSnapshot(); }
      catch { return { error: "TradePrint not connected yet (needs its service key)." }; }
    }
    default: return { error: `unknown tool ${name}` };
  }
}
