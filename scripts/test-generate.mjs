// Standalone proof: load a brand from KalebOS, generate a content piece via OpenRouter,
// insert it into content_scripts. Run: node scripts/test-generate.mjs <brandSlug> <platform> "<topic>"
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../dashboard/.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);

const SUPA = env.SUPABASE_URL, KEY = env.SUPABASE_SECRET_KEY;
const ORK = env.OPENROUTER_API_KEY, MODEL = env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.6";
const sb = (path, opts = {}) =>
  fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(opts.headers || {}) } });

const [slug = "ai", platform = "reels", topic = "AI that follows up with leads instantly so you never lose a deal to slow response time"] = process.argv.slice(2);

const PLATFORM_RULES = {
  reels: "IG/TikTok/Shorts. 15-45s. Hook in first 1.5s. VO + on-screen text beats. One idea. Provide beats.",
  linkedin: "120-250 words. Hook line + white space + story/insight + ONE takeaway. No hashtag spam.",
  x: "Single punchy post OR 4-7 tweet thread (numbered in body). Strong first line.",
  youtube: "5-12 min outline in body: hook->stakes->3-5 beats w/ retention resets->recap->CTA. b-roll in beats.",
};

const brand = (await (await sb(`brands?slug=eq.${slug}&select=*`)).json())[0];
if (!brand) { console.error(`brand ${slug} not found`); process.exit(1); }

const pillars = (brand.pillars || []).map((p) => `- ${p.name} (w${p.weight}): ${p.description}`).join("\n");
const collab = (brand.default_collab_with || []).length
  ? `Usually post as COLLAB with: ${brand.default_collab_with.join(", ")} (personal page builds trust). Set collab=true unless purely niche.`
  : `Personal page (center of gravity). Post solo unless clear niche reason.`;

const system = `You are the content strategist + scriptwriter for "${brand.name}" (${brand.kind}).
PURPOSE: ${brand.purpose}
VOICE (match exactly): ${brand.voice}
PILLARS:\n${pillars}
CTA RULES: ${brand.cta_rules}
COLLABORATION: ${collab}
PLATFORM (${platform}): ${PLATFORM_RULES[platform]}
STRATEGIC RULE: never write for views alone — build trust/teach/curiosity/conversation/leads/authority/connection.
Return ONE JSON object, no prose, EXACT keys: brand, collab(bool), collab_with(string[]), pillar, goal(trust|teach|curiosity|conversation|leads|authority|connection), target_audience, platform, format, hook, caption, body, cta, thumbnail_text, comment_ideas(string[]), beats([{type,text}]).`;

console.log(`\n⏳ Generating ${platform} for ${brand.name} via ${MODEL}...\n`);
const t0 = Date.now();
const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${ORK}`, "Content-Type": "application/json", "X-Title": "Kaleb OS Content Engine" },
  body: JSON.stringify({ model: MODEL, temperature: 0.8, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: `TOPIC: ${topic}\nWrite the strongest possible ${platform} piece.` }] }),
});
if (!res.ok) { console.error(`OpenRouter ${res.status}:`, await res.text()); process.exit(1); }
const raw = (await res.json()).choices[0].message.content;
const piece = JSON.parse(raw.match(/[[{][\s\S]*[\]}]/)[0]);
console.log(`✅ Generated in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
console.log(JSON.stringify(piece, null, 2));

// Persist
const ins = await sb("content_scripts", { method: "POST", body: JSON.stringify({
  brand_id: brand.id, collab: piece.collab, collab_with: piece.collab_with || [], pillar: piece.pillar,
  goal: piece.goal, target_audience: piece.target_audience, platform, format: piece.format,
  hook: piece.hook, caption: piece.caption, body: piece.body, cta: piece.cta,
  thumbnail_text: piece.thumbnail_text, comment_ideas: piece.comment_ideas || [], beats: piece.beats || null, status: "draft" }) });
const saved = await ins.json();
console.log(`\n💾 Saved to content_scripts id=${saved[0]?.id}`);
