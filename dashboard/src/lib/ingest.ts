import { LLM_MODEL } from "./llm";
import { TOOLS, execTool, getContext } from "./assistant";

type Msg = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string };

export type IngestResult = { summary: string; filed: number; actions: { tool: string; args: unknown }[]; error?: string };

// Turn a raw capture (PLAUD recording / voice memo / brain-dump) into filed
// Kaleb OS records by running Atlas's tool-loop in INGEST MODE. Shared by
// /api/ingest/transcript and /api/ingest/plaud.
export async function ingestTranscript(transcript: string, source?: string): Promise<IngestResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { summary: "", filed: 0, actions: [], error: "OPENROUTER_API_KEY not set" };

  const { persona } = await getContext();
  const system = [
    persona || "You are Atlas, Kaleb's operating system.",
    "\nINGEST MODE. Kaleb just captured the following (via " + (source || "voice/PLAUD") + "). It's raw and unstructured — a meeting, a brain-dump, or a trade recap.",
    "Your job: extract EVERY actionable/loggable item and FILE each one using your tools. Be thorough but don't invent things that aren't there.",
    "- New idea/thought → log_idea (content idea for a brand → log_content_idea)",
    "- To-do / reminder / follow-up → add_task",
    "- Project update (e.g. building something) → log_project",
    "- Client mention/update/note → update_client",
    "- Trade recap (entry/exit/process) → log_trade",
    "- Reflection / meditation / how he's feeling → add_journal",
    "- A lasting fact about Kaleb (preference, how he works, goal) → remember",
    "- An email/text he wants sent → draft_email (goes to approval, never sent)",
    "BE COMPLETE, don't be conservative: if he mentions a meditation or how he felt → ALWAYS add_journal. If he mentions ANY trade → ALWAYS log_trade (capture the process/transcript even if it was a clean trade). A content idea for a brand → log_content_idea (brand me|ai|trading), not just log_idea. Capture everything real.",
    "After filing everything, reply with a tight bullet summary of exactly what you logged (and flag anything ambiguous you skipped).",
  ].join("\n");

  const messages: Msg[] = [
    { role: "system", content: system },
    { role: "user", content: String(transcript) },
  ];
  const actions: { tool: string; args: unknown }[] = [];

  for (let i = 0; i < 8; i++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Kaleb OS Ingest" },
      body: JSON.stringify({ model: LLM_MODEL, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.3 }),
    });
    if (!res.ok) return { summary: "", filed: actions.length, actions, error: `OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}` };
    const m = (await res.json()).choices?.[0]?.message;
    if (!m) return { summary: "", filed: actions.length, actions, error: "no response" };

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
    return { summary: m.content ?? "", filed: actions.length, actions };
  }
  return { summary: "(stopped after several steps)", filed: actions.length, actions };
}

// Shared secret check for the ingest endpoints (Bearer or ?key=).
export function ingestAuthorized(request: Request): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return true; // open in local dev when unset
  const auth = request.headers.get("authorization");
  const key = new URL(request.url).searchParams.get("key");
  return auth === `Bearer ${secret}` || key === secret;
}
