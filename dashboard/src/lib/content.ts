// Content Engine brain — turns a brand + topic into the 10-field content contract.
// Loads brand config from Supabase, builds a voice-accurate prompt, generates via OpenRouter,
// persists an idea + script, and returns the piece.

import { supabase } from "./supabase";
import { chatJSON } from "./llm";

export type Platform = "reels" | "linkedin" | "x" | "youtube";
export type Goal =
  | "trust" | "teach" | "curiosity" | "conversation" | "leads" | "authority" | "connection";

export interface Brand {
  id: string;
  slug: string;
  name: string;
  kind: "personal" | "niche" | "client";
  purpose?: string;
  voice?: string;
  pillars?: { name: string; description?: string; weight?: number }[];
  niches?: string[];
  banned?: string[];
  cta_rules?: string;
  default_collab_with?: string[];
}

// The 10-field output contract (+ persistence-friendly extras).
export interface ContentPiece {
  brand: string;            // (1) brand slug
  collab: boolean;          // (2) collaboration?
  collab_with: string[];    //     which brand slugs
  pillar: string;           // (3) content pillar
  goal: Goal;               // (4) goal of the post
  target_audience: string;  // (5) target audience
  platform: Platform;       // (6 lives here) platform
  format: string;
  hook: string;             // (6) hook
  caption: string;          // (7) caption
  body: string;             // full script / VO
  cta: string;              // (8) CTA
  thumbnail_text: string;   // (9) thumbnail text
  comment_ideas: string[];  // (10) engagement comments
  beats?: { type: string; text: string }[]; // on-screen/VO/b-roll for video
}

const PLATFORM_RULES: Record<Platform, string> = {
  reels:
    "IG/TikTok/Shorts. 15-45s. Hook must land in the first 1.5s. Spoken VO + on-screen text beats. " +
    "One idea per video. Pattern-interrupt open, deliver the payoff before they swipe. Provide `beats`.",
  linkedin:
    "120-250 words. Strong hook line, generous white space, story/insight, ONE clear takeaway. " +
    "No hashtag spam. Professional but human.",
  x:
    "Single punchy post OR a 4-7 tweet thread (put the thread in `body`, numbered). " +
    "Strong first line, no throat-clearing.",
  youtube:
    "5-12 min outline in `body`: hook (0:00-0:30) -> stakes -> 3-5 beats with retention resets -> " +
    "recap -> CTA. Include b-roll notes in `beats`.",
};

const FORMAT_BY_PLATFORM: Record<Platform, string> = {
  reels: "short_video", linkedin: "post", x: "thread", youtube: "long_video",
};

export async function loadBrand(slug: string): Promise<Brand> {
  const { data, error } = await supabase.from("brands").select("*").eq("slug", slug).single();
  if (error) throw new Error(`loadBrand(${slug}): ${error.message}`);
  return data as Brand;
}

function buildSystemPrompt(brand: Brand, platform: Platform): string {
  const pillars = (brand.pillars ?? [])
    .map((p) => `- ${p.name}${p.weight ? ` (weight ${p.weight})` : ""}: ${p.description ?? ""}`)
    .join("\n");
  const collab =
    brand.default_collab_with && brand.default_collab_with.length
      ? `This brand usually posts as a COLLABORATION with: ${brand.default_collab_with.join(", ")} ` +
        `(the personal page is the center of gravity — it builds trust in the person). Set collab=true and ` +
        `collab_with accordingly UNLESS the piece is purely niche with no personal angle.`
      : `This is the personal page (center of gravity). Post solo (collab=false) unless there is a clear niche reason.`;

  return [
    `You are the content strategist + scriptwriter for "${brand.name}" (${brand.kind} brand).`,
    brand.purpose ? `PURPOSE: ${brand.purpose}` : "",
    brand.voice ? `VOICE (match exactly): ${brand.voice}` : "",
    pillars ? `PILLARS:\n${pillars}` : "",
    brand.cta_rules ? `CTA RULES: ${brand.cta_rules}` : "",
    brand.banned?.length ? `BANNED words/cliches — never use: ${brand.banned.join(", ")}` : "",
    `COLLABORATION: ${collab}`,
    `PLATFORM (${platform}): ${PLATFORM_RULES[platform]}`,
    `STRATEGIC RULE: never write for views alone. Every piece must build trust, teach, create curiosity, ` +
      `start conversation, generate leads, strengthen authority, or deepen connection.`,
    "",
    `Return ONE JSON object, no prose, with EXACTLY these keys:`,
    `{`,
    `  "brand": "${brand.slug}",`,
    `  "collab": boolean,`,
    `  "collab_with": string[],            // brand slugs, [] if none`,
    `  "pillar": string,                   // which pillar above`,
    `  "goal": "trust|teach|curiosity|conversation|leads|authority|connection",`,
    `  "target_audience": string,`,
    `  "platform": "${platform}",`,
    `  "format": "${FORMAT_BY_PLATFORM[platform]}",`,
    `  "hook": string,                     // first line / first 1.5s`,
    `  "caption": string,`,
    `  "body": string,                     // full script / VO / thread / outline`,
    `  "cta": string,`,
    `  "thumbnail_text": string,           // <= 6 words, punchy`,
    `  "comment_ideas": string[],          // 2-3 comments to seed engagement`,
    `  "beats": [{"type": "on_screen|vo|b_roll", "text": string}]  // [] for non-video`,
    `}`,
  ].filter(Boolean).join("\n");
}

export interface GenerateInput {
  brandSlug: string;
  topic: string;
  platform: Platform;
  research?: string;   // optional research/context to ground the piece
  persist?: boolean;   // default true
}

export async function generateContentPiece(input: GenerateInput): Promise<{ piece: ContentPiece; scriptId?: string }> {
  const brand = await loadBrand(input.brandSlug);
  const system = buildSystemPrompt(brand, input.platform);
  const user = [
    `TOPIC / ANGLE: ${input.topic}`,
    input.research ? `\nRESEARCH / CONTEXT to ground this in:\n${input.research}` : "",
    `\nWrite the strongest possible ${input.platform} piece for ${brand.name}.`,
  ].join("\n");

  const piece = await chatJSON<ContentPiece>(system, user, { temperature: 0.8 });

  // Defensive defaults + normalize collab_with to brand slugs
  piece.brand = brand.slug;
  piece.platform = input.platform;
  piece.comment_ideas = piece.comment_ideas ?? [];
  const SLUG_ALIASES: Record<string, string> = {
    "personal page": "me", personal: "me", "kaleb": "me", "kaleb mucius": "me",
    "ka1eb.ai": "ai", "kaleb ai": "ai", "ai page": "ai",
    "trading page": "trading", trading: "trading",
  };
  piece.collab_with = (piece.collab_with ?? [])
    .map((s) => {
      const key = String(s).toLowerCase().trim().replace(/_/g, " ");
      return SLUG_ALIASES[key] ?? key.replace(/\s+/g, "-");
    })
    .filter((s) => s !== brand.slug);
  // If brand expects a default collab and the model returned none, apply the default.
  if (piece.collab && piece.collab_with.length === 0 && brand.default_collab_with?.length) {
    piece.collab_with = brand.default_collab_with;
  }

  if (input.persist === false) return { piece };

  // Persist: idea -> script
  const { data: idea } = await supabase
    .from("content_ideas")
    .insert({
      brand_id: brand.id,
      title: input.topic.slice(0, 200),
      angle: piece.hook,
      platform: input.platform,
      pillar: piece.pillar,
      goal: piece.goal,
      collab: piece.collab,
      collab_with: piece.collab_with,
      hook_options: [piece.hook],
      status: "scripted",
    })
    .select("id")
    .single();

  const { data: script, error: scriptErr } = await supabase
    .from("content_scripts")
    .insert({
      brand_id: brand.id,
      idea_id: idea?.id ?? null,
      collab: piece.collab,
      collab_with: piece.collab_with,
      pillar: piece.pillar,
      goal: piece.goal,
      target_audience: piece.target_audience,
      platform: input.platform,
      format: piece.format ?? FORMAT_BY_PLATFORM[input.platform],
      hook: piece.hook,
      caption: piece.caption,
      body: piece.body,
      cta: piece.cta,
      thumbnail_text: piece.thumbnail_text,
      comment_ideas: piece.comment_ideas,
      beats: piece.beats ?? null,
      status: "draft",
    })
    .select("id")
    .single();
  if (scriptErr) throw new Error(`persist script: ${scriptErr.message}`);

  return { piece, scriptId: script?.id };
}
