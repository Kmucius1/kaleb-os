import { supabase } from "@/lib/supabase";
import { chat, LLM_MODEL } from "@/lib/llm";
import { sendTelegram } from "@/lib/telegram";
import { syncClientBrands } from "@/lib/crm-sync";

// Vercel Cron hits this daily. Also runnable manually with the same bearer.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BRANDS = [
  { slug: "me", emoji: "🟢", label: "Personal" },
  { slug: "ai", emoji: "🟣", label: "Ka1eb.ai" },
  { slug: "trading", emoji: "🟡", label: "Trading" },
];

type Idea = { brand_slug: string; hook: string; pillar?: string; angle?: string; why_now?: string; platform?: string };

export async function GET(request: Request) {
  // Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` for cron runs.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const log: Record<string, unknown> = {};

  // 1. Keep the client roster in sync with the CRM.
  try { log.crm = await syncClientBrands(); } catch (e) { log.crm_error = (e as Error).message; }

  // 2. Load the 3 personal brands + their config.
  const { data: brands } = await supabase
    .from("brands").select("id,slug,name,voice,pillars").in("slug", BRANDS.map(b => b.slug));
  const bySlug = new Map((brands ?? []).map(b => [b.slug, b]));

  // 3. Generate fresh, web-grounded ideas (one OpenRouter :online call).
  const brandBlock = BRANDS.map(b => {
    const br = bySlug.get(b.slug);
    const pillars = (br?.pillars ?? []).map((p: { name: string }) => p.name).join(", ");
    return `- ${b.slug} (${br?.name}): pillars = ${pillars}`;
  }).join("\n");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
  let ideas: Idea[] = [];
  try {
    const raw = await chat([
      { role: "system", content: "You are Kaleb's content strategist. Use the web to ground ideas in what is genuinely happening TODAY in AI, business, and markets. Return ONLY a JSON array, no prose." },
      { role: "user", content:
        `Date: ${today}.\nBrands:\n${brandBlock}\n\n` +
        `Give 2 timely content ideas PER brand, grounded in real current events/trends (use web). ` +
        `Return JSON array of objects: {brand_slug, hook, pillar, angle, why_now, platform}. ` +
        `platform one of reels|linkedin|x|youtube. Make hooks scroll-stopping and on-brand.` },
    ], { model: `${LLM_MODEL}:online`, temperature: 0.8 });
    const m = raw.match(/\[[\s\S]*\]/);
    ideas = m ? JSON.parse(m[0]) : [];
  } catch (e) { log.ideas_error = (e as Error).message; }

  // 4. Persist ideas.
  if (ideas.length) {
    const rows = ideas.filter(i => bySlug.has(i.brand_slug)).map(i => ({
      brand_id: bySlug.get(i.brand_slug)!.id,
      title: (i.angle || i.hook || "").slice(0, 200),
      angle: i.hook, pillar: i.pillar, platform: i.platform || "reels",
      hook_options: i.hook ? [i.hook] : [], status: "idea",
      created_by: "morning-brain", notes: i.why_now,
    }));
    if (rows.length) { try { await supabase.from("content_ideas").insert(rows); } catch (e) { log.save_error = (e as Error).message; } }
  }

  // 5. Compose + send the Telegram brief.
  const clientCount = (log.crm as { total_clients?: number })?.total_clients;
  let msg = `☀️ *Kaleb OS — Morning Brief*\n_${today}_\n\n*Today's content ideas:*\n`;
  for (const b of BRANDS) {
    const mine = ideas.filter(i => i.brand_slug === b.slug);
    if (!mine.length) continue;
    msg += `\n${b.emoji} *${b.label}*\n`;
    for (const i of mine) msg += `• ${i.hook}${i.why_now ? `  _(${i.why_now})_` : ""}\n`;
  }
  if (typeof clientCount === "number") msg += `\n📊 Clients synced from CRM: *${clientCount}*\n`;
  msg += `\n→ Open: https://kalebos.vercel.app/content`;

  let sent = false;
  try { await sendTelegram(msg); sent = true; } catch (e) { log.telegram_error = (e as Error).message; }

  return Response.json({ ok: true, sent, ideas: ideas.length, log });
}
