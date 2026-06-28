// Tools the "Ask Kaleb OS" voice/chat assistant can call (read your data + act).
import { supabase } from "./supabase";
import { supabaseDryp } from "./supabaseDryp";
import { supabaseLedger } from "./supabaseLedger";
import { logIdea, addTask, draftMessage, getToday } from "./kalebos-actions";

// OpenAI/OpenRouter-style tool definitions.
export const TOOLS = [
  { type: "function", function: { name: "get_revenue", description: "DRYP revenue/P&L (cash received). period: week|month|all.", parameters: { type: "object", properties: { period: { type: "string", enum: ["week", "month", "all"] } } } } },
  { type: "function", function: { name: "get_clients", description: "Active DRYP clients (health, retainer) + open leads.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_today", description: "Today's snapshot: content ideas, open tasks, drafted scripts, clients, leads.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "search_emails", description: "Search Kaleb's captured emails (Gmail) by keyword/person to understand context before drafting.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "draft_email", description: "Draft an email (goes to approval queue, never auto-sends).", parameters: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "body"] } } },
  { type: "function", function: { name: "log_idea", description: "Save an idea Kaleb mentions.", parameters: { type: "object", properties: { idea: { type: "string" } }, required: ["idea"] } } },
  { type: "function", function: { name: "add_task", description: "Add a to-do/reminder.", parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] } } },
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
    case "log_idea": return await logIdea({ idea: String(args.idea) });
    case "add_task": return await addTask({ title: String(args.title) });
    default: return { error: `unknown tool ${name}` };
  }
}
