import { chatJSON } from "./llm";
import { TASK_AREAS, type TaskArea, type TaskOwner, type Triage } from "./tasks";
import { TRIAGE_RUBRIC, TRIAGE_FORMAT } from "./taskRubric.mjs";

// Server-only half of triage — kept out of lib/tasks.ts so the client bundle
// doesn't drag the OpenRouter client along for a bucket calculation.

type TriageInput = { id: string; title: string; description?: string | null; source?: string | null };

// Triage a batch of tasks in one call. Returns a map id -> triage; anything the
// model skips or mangles is left out, and the caller leaves that row untriaged
// rather than guessing.
export async function triageBatch(tasks: TriageInput[]): Promise<Record<string, Triage>> {
  if (!tasks.length) return {};
  const payload = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    ...(t.description ? { description: t.description.slice(0, 300) } : {}),
    ...(t.source ? { from: t.source } : {}),
  }));

  const out = await chatJSON<{ tasks?: Array<{ id: string; owner: string; priority: number; area: string }> }>(
    `${TRIAGE_RUBRIC}\n\n${TRIAGE_FORMAT}`,
    JSON.stringify(payload),
    { temperature: 0 },
  );

  const valid = new Set(tasks.map((t) => t.id));
  const result: Record<string, Triage> = {};
  for (const r of out?.tasks ?? []) {
    if (!valid.has(r?.id)) continue;
    const owner: TaskOwner = r.owner === "team" || r.owner === "other" ? r.owner : "kaleb";
    const priority = Math.min(10, Math.max(1, Math.round(Number(r.priority) || 5)));
    const area = (TASK_AREAS as readonly string[]).includes(r.area) ? (r.area as TaskArea) : "other";
    result[r.id] = { owner, priority, area };
  }
  return result;
}
