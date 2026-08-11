import { LLM_MODEL } from "./llm";
import { TOOLS, execTool, getContext } from "./assistant";

type Msg = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string };

export type IngestResult = { summary: string; filed: number; actions: { tool: string; args: unknown }[]; error?: string };

// Code word that routes a capture into Trade Print (Kaleb's trading journal).
// Only captures containing this phrase are forwarded — everything else stays in Kaleb OS only.
const TRADING_SESSION_CODE = /start\s+trading\s+session/i;

// Spoken code words Kaleb can say at the start of any PLAUD recording (hands-free,
// no app interaction needed) to force reliable categorization instead of leaving
// it to the model to guess from content alone. Checked against the transcript AND
// the PLAUD recording name/source label, so a renamed file works too.
type CaptureCode = { pattern: RegExp; hint: (m: RegExpMatchArray) => string };
const CAPTURE_CODES: CaptureCode[] = [
  {
    pattern: TRADING_SESSION_CODE,
    hint: () =>
      "TRADING SESSION (code word detected) — file the process via log_trade even if it's narration, not just a clean entry/exit recap.",
  },
  {
    pattern: /start\s+client\s+meeting\b(?:[:,\-]?\s*(?:with\s+)?([a-z0-9 &.'-]{2,40}))?/i,
    hint: (m) =>
      `CLIENT MEETING (code word detected)${m[1] ? ` with "${m[1].trim()}"` : ""} — file via update_client (match the client by name${m[1] ? `, try "${m[1].trim()}"` : ""}, note = full recap), and add_task for any follow-ups/commitments mentioned.`,
  },
  {
    pattern: /start\s+board\s+meeting/i,
    hint: () =>
      'BOARD MEETING (code word detected) — file the discussion/decisions via add_journal (kind=\'note\', content prefixed "Board meeting:"), and add_task for every commitment or follow-up. This is a formal meeting record, not casual chatter — don\'t skip it.',
  },
  {
    pattern: /start\s+(?:office|work)\s+session/i,
    hint: () =>
      "OFFICE / WORK SESSION (code word detected) — focused work time, not personal reflection. File progress via log_project, todos via add_task, strategic notes via log_idea (category='business'). Skip add_journal unless he explicitly reflects on how he's feeling.",
  },
  {
    pattern: /start\s+(?:family|personal)\s+time/i,
    hint: () =>
      "FAMILY / PERSONAL TIME (code word detected) — file via add_journal (kind='reflection' or 'gratitude', whichever fits) and remember for lasting facts about people close to him. Do NOT file business/work items from this stretch even if mentioned in passing, unless he explicitly says to log something.",
  },
  {
    pattern: /start\s+(?:side\s+hustle|project)\b(?:[:,\-]?\s*([a-z0-9 &.'-]{2,40}))?/i,
    hint: (m) =>
      `SIDE HUSTLE / PROJECT WORK (code word detected)${m[1] ? ` on "${m[1].trim()}"` : ""} — file the update via log_project (name${m[1] ? ` = "${m[1].trim()}"` : ", inferred from context"}), log_endeavor if he mentions revenue/income for it, and add_task for follow-ups.`,
  },
];

// Scan transcript + source label for any code words and turn matches into
// explicit routing instructions injected into the ingest system prompt.
function detectCaptureCodeHints(transcript: string, source?: string): string[] {
  const text = `${source || ""}\n${transcript}`;
  const hints: string[] = [];
  for (const code of CAPTURE_CODES) {
    const m = text.match(code.pattern);
    if (m) hints.push(code.hint(m));
  }
  return hints;
}

// If Kaleb said the code word, forward the FULL narration to Trade Print so it lands
// as a trading session (his live setup/chart commentary). Best-effort, never blocks ingest.
async function maybeForwardTradingSession(transcript: string, source?: string): Promise<void> {
  if (!TRADING_SESSION_CODE.test(transcript)) return;
  const url = process.env.TRADEPRINT_SESSION_INGEST_URL;
  const secret = process.env.TRADEPRINT_INGEST_SECRET;
  if (!url || !secret) return; // connection not configured — no-op
  try {
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, source: source || "PLAUD" }),
    });
  } catch {
    // best-effort: Trade Print being down must never break Kaleb OS ingest
  }
}

// A multi-hour PLAUD meeting can run to several hundred thousand characters —
// far more than one ingest pass can chew through inside a function's time limit.
// Split it into pieces small enough to file one at a time. The split is
// deterministic (fixed budget, snapped to the nearest line break) so a caller
// can stop partway through and resume at the same chunk index on a later run.
export function chunkTranscript(text: string, maxChars: number): string[] {
  const t = text.trim();
  if (t.length <= maxChars) return [t];
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxChars, t.length);
    if (end < t.length) {
      // Prefer a line break, then a sentence end, but never backtrack so far
      // that we make barely any progress.
      const floor = i + Math.floor(maxChars * 0.6);
      const nl = t.lastIndexOf("\n", end);
      const dot = t.lastIndexOf(". ", end);
      const cut = Math.max(nl, dot);
      if (cut > floor) end = cut + 1;
    }
    chunks.push(t.slice(i, end).trim());
    i = end;
  }
  return chunks.filter(Boolean);
}

// Turn a raw capture (PLAUD recording / voice memo / brain-dump) into filed
// Kaleb OS records by running Atlas's tool-loop in INGEST MODE. Shared by
// /api/ingest/transcript and /api/ingest/plaud.
export async function ingestTranscript(transcript: string, source?: string): Promise<IngestResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { summary: "", filed: 0, actions: [], error: "OPENROUTER_API_KEY not set" };

  // Route into Trade Print if Kaleb used the code word (parallel to Kaleb OS filing).
  void maybeForwardTradingSession(String(transcript), source);

  const { persona } = await getContext();
  const codeHints = detectCaptureCodeHints(String(transcript), source);
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
    ...(codeHints.length
      ? [
          "\nSPOKEN CODE WORDS DETECTED — Kaleb said one of his category triggers at the start of this capture. Follow these over guessing from content alone:",
          ...codeHints.map((h) => `- ${h}`),
        ]
      : []),
    "After filing everything, reply with a tight bullet summary of exactly what you logged (and flag anything ambiguous you skipped).",
  ].join("\n");

  const messages: Msg[] = [
    { role: "system", content: system },
    { role: "user", content: String(transcript) },
  ];
  const actions: { tool: string; args: unknown }[] = [];
  let nudged = false;

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

    // The model sometimes answers with a confident recap ("Tasks Added: ...")
    // WITHOUT ever calling a tool, so nothing is actually saved and the capture
    // is silently lost. If it filed nothing off a real transcript, call that out
    // once and make it do the work before we accept the answer.
    if (actions.length === 0 && !nudged && String(transcript).length > 500) {
      nudged = true;
      messages.push(m);
      messages.push({
        role: "user",
        content:
          "You did not call any tools, so NOTHING was saved — a summary alone files nothing. Re-read the capture and actually call the tools now for every item worth keeping (tasks, ideas, projects, clients, trades, journal entries, facts to remember). If after re-reading there is genuinely nothing to file, reply with exactly: NOTHING TO FILE.",
      });
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
