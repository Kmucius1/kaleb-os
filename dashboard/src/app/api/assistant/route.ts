import { TOOLS, execTool, getContext } from "@/lib/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Fast, cheap, strong tool-use model for the interactive controller.
// Gemini 2.5 Flash: ~40x cheaper than Haiku, faster, solid tool-calling.
// Content generation stays on the higher-quality model in lib/llm.ts.
const CHAT_MODEL = process.env.CHAT_MODEL || "google/gemini-2.5-flash";

type Msg = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string };

// POST /api/assistant  { messages: [{role:'user'|'assistant', content}] }
export async function POST(request: Request) {
  try {
    const { messages: incoming } = await request.json().catch(() => ({ messages: [] }));
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return Response.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
    const { persona, profile } = await getContext();
    const system = [
      persona || "You are Kaleb's personal AI — sharp, warm, direct, in his corner.",
      "\nThe user is KALEB (Kaleb Mucius). Always address him as Kaleb. Never question, correct, or second-guess his name.",
      profile.length ? `\nWHAT YOU KNOW ABOUT KALEB:\n- ${profile.join("\n- ")}` : "",
      "\nYOU ARE THE CONTROLLER of Kaleb OS. Kaleb runs his whole system by talking to you. You can pull data AND change things: set/cancel reminders, change his daily meditation & journal check-in times (set_checkin_times), log his mood, complete tasks, add goals, update projects, change app settings (update_setting), and even adjust your own behavior (tune_atlas). When he asks to change a setting or do something in the app, DO IT with the right tool — don't tell him to do it himself.",
      "\nRULES:",
      "ALWAYS use tools to look up REAL data before answering about money, clients, P&L, tasks, or content — never guess numbers.",
      "For emails: FIRST call search_emails to understand history with that person, then draft_email. Drafts go to the approval queue and are NEVER auto-sent.",
      "If it's a brand-new email and you lack context, ask Kaleb what it should say first.",
      "When Kaleb tells you something lasting about himself (a preference, how he works, a goal), call remember so you know him better next time.",
      "Just do low-risk actions (log idea, add task, pull data). Ask before anything that sends, spends, or deletes.",
      `Today is ${today}.`,
    ].join("\n");

    const messages: Msg[] = [{ role: "system", content: system }, ...(incoming ?? [])];
    const actions: { tool: string; args: unknown }[] = [];
    let cost = 0; // real $ from OpenRouter, summed across tool-loop turns

    for (let i = 0; i < 6; i++) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Kaleb OS Assistant" },
        body: JSON.stringify({ model: CHAT_MODEL, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.4, usage: { include: true } }),
      });
      if (!res.ok) return Response.json({ error: `OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}` }, { status: 502 });
      const data = await res.json();
      cost += data.usage?.cost ?? 0;
      const m = data.choices?.[0]?.message;
      if (!m) return Response.json({ error: "no response" }, { status: 502 });

      if (m.tool_calls?.length) {
        messages.push(m);
        for (const tc of m.tool_calls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
          const result = await execTool(tc.function.name, args);
          actions.push({ tool: tc.function.name, args });
          messages.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(result) });
        }
        continue;
      }
      return Response.json({ reply: m.content ?? "", actions, cost });
    }
    return Response.json({ reply: "(stopped after several tool steps)", actions, cost });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
