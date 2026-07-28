// Turning what Kaleb said into what KalebOS should do.
//
// The rule from the spec, and the one that matters: extract freely, but never
// silently create a commitment. Everything lands in the approval queue with the
// exact sentence it came from, so nothing appears in his life that he didn't
// put there.

import { chatJSON } from "../llm";
import { supabase } from "../supabase";
import { PILLARS } from "./pillars";

export type Extracted = {
  summary: string;
  pillar: string | null;
  people: string[];
  projects: string[];
  goals: string[];
  decisions: string[];
  ideas: { text: string; category: "content" | "business" | "trading" | "personal" }[];
  wins: string[];
  frustrations: string[];
  /** Things he said he would do — the ones that need approval before becoming tasks. */
  commitments: { text: string; deadline: string | null; quote: string }[];
  followups: { text: string; who: string | null; quote: string }[];
  tags: string[];
  /** Thoughts worth turning into content. */
  contentSeeds: string[];
};

const EMPTY: Extracted = {
  summary: "",
  pillar: null,
  people: [],
  projects: [],
  goals: [],
  decisions: [],
  ideas: [],
  wins: [],
  frustrations: [],
  commitments: [],
  followups: [],
  tags: [],
  contentSeeds: [],
};

const SYSTEM = `You extract structure from Kaleb's personal journal entries.

Kaleb runs DRYP Digital (an agency), trades forex, builds software (KalebOS, an
MT4 bot, e-commerce automation), makes content, and lives in South Florida.

Return JSON with exactly these keys:
  summary        - one or two sentences, his voice, no therapy-speak
  pillar         - the single best fit of: ${PILLARS.join(", ")} — or null
  people         - names mentioned
  projects       - projects/businesses mentioned
  goals          - goals referenced
  decisions      - decisions he actually made (not options he weighed)
  ideas          - [{text, category: content|business|trading|personal}]
  wins           - things that went right
  frustrations   - things that went wrong or drained him
  commitments    - [{text, deadline (YYYY-MM-DD or null), quote}] things HE said he will do
  followups      - [{text, who (or null), quote}] things needing a reply or chase
  tags           - 2-5 short lowercase tags
  contentSeeds   - thoughts that would make good content, as hooks

Rules:
- Only extract what is actually in the entry. Empty arrays are correct and expected.
- "quote" must be the exact words from the entry that produced the item.
- Do not diagnose emotions, infer mental-health conditions, or give medical advice.
  Describe what he said, not what it "means" about him.
- Do not invent deadlines. Null unless he stated one.`;

/**
 * "Nothing to extract" and "couldn't reach the model" are different answers and
 * must never look the same — otherwise a dead API key reads as a quiet journal.
 */
export type ExtractResult =
  | { ok: true; extracted: Extracted }
  | { ok: false; extracted: Extracted; error: string };

export async function extractFromEntry(content: string): Promise<ExtractResult> {
  if (!content.trim()) return { ok: true, extracted: EMPTY };
  try {
    const raw = await chatJSON<Partial<Extracted>>(SYSTEM, content.slice(0, 12000), { temperature: 0.2 });
    return { ok: true, extracted: normalize(raw) };
  } catch (e) {
    return { ok: false, extracted: EMPTY, error: describeFailure(e) };
  }
}

/** Turn provider noise into something Kaleb can act on. */
function describeFailure(e: unknown): string {
  const msg = (e as Error)?.message ?? "";
  if (/limit exceeded|quota|402|403/i.test(msg)) {
    return "Your OpenRouter key is out of credit this month, so I couldn't read the entry back. The entry itself is saved.";
  }
  if (/OPENROUTER_API_KEY is not set/i.test(msg)) {
    return "No OpenRouter key configured, so I couldn't read the entry back. The entry itself is saved.";
  }
  if (/did not return JSON/i.test(msg)) {
    return "The model returned something I couldn't parse. Your entry is saved — try extracting again.";
  }
  return "Couldn't reach the model just now. Your entry is saved.";
}

function normalize(raw: Partial<Extracted>): Extracted {
  return {
      ...EMPTY,
      ...raw,
      // Defend every array — a model that returns a string here shouldn't crash a render.
      people: arr(raw.people),

      projects: arr(raw.projects),
      goals: arr(raw.goals),
      decisions: arr(raw.decisions),
      wins: arr(raw.wins),
      frustrations: arr(raw.frustrations),
      tags: arr(raw.tags),
      contentSeeds: arr(raw.contentSeeds),
      ideas: Array.isArray(raw.ideas) ? raw.ideas.filter((i) => i && typeof i.text === "string") : [],
      commitments: Array.isArray(raw.commitments) ? raw.commitments.filter((c) => c && typeof c.text === "string") : [],
      followups: Array.isArray(raw.followups) ? raw.followups.filter((f) => f && typeof f.text === "string") : [],
      pillar: (PILLARS as readonly string[]).includes(String(raw.pillar)) ? String(raw.pillar) : null,
      summary: typeof raw.summary === "string" ? raw.summary : "",
  };
}

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

export type Proposal = {
  id: string;
  kind: "task" | "followup" | "idea" | "content_idea";
  text: string;
  detail: string | null;
  quote: string | null;
};

/**
 * Queue everything that would change Kaleb's world. Nothing here executes —
 * each row waits in /approvals until he says yes.
 */
export async function queueProposals(journalId: string, x: Extracted): Promise<Proposal[]> {
  const rows = [
    ...x.commitments.map((c) => ({
      kind: "task" as const,
      text: c.text,
      detail: c.deadline,
      quote: c.quote,
    })),
    ...x.followups.map((f) => ({
      kind: "followup" as const,
      text: f.text,
      detail: f.who,
      quote: f.quote,
    })),
    ...x.ideas.map((i) => ({ kind: "idea" as const, text: i.text, detail: i.category, quote: null })),
    ...x.contentSeeds.map((s) => ({ kind: "content_idea" as const, text: s, detail: null, quote: null })),
  ];
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("agent_actions")
    .insert(
      rows.map((r) => ({
        action_type: `journal_${r.kind}`,
        risk_tier: "low",
        target_table: "journal",
        payload: { ...r, journal_id: journalId },
        status: "pending_approval",
        reasoning: r.quote ? `From your journal: "${r.quote}"` : "Extracted from your journal entry.",
      }))
    )
    .select("id,payload");

  if (error || !data) return [];
  return data.map((d) => {
    const p = d.payload as Record<string, unknown>;
    return {
      id: d.id as string,
      kind: p.kind as Proposal["kind"],
      text: String(p.text ?? ""),
      detail: (p.detail as string) ?? null,
      quote: (p.quote as string) ?? null,
    };
  });
}
