// LLM brain for the Content Engine — routed through OpenRouter (Kaleb's choice: more control).
// Key: OPENROUTER_API_KEY. Model: OPENROUTER_MODEL (defaults to a Claude model).
// Set OPENROUTER_MODEL in .env.local to pin/change the model, e.g.:
//   anthropic/claude-sonnet-4.5  |  anthropic/claude-opus-4.1  |  anthropic/claude-3.5-sonnet

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const LLM_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function chat(
  messages: Msg[],
  opts: { model?: string; temperature?: number; jsonMode?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // Optional but recommended by OpenRouter for attribution:
      "HTTP-Referer": "https://kalebos.app",
      "X-Title": "Kaleb OS Content Engine",
    },
    body: JSON.stringify({
      model: opts.model || LLM_MODEL,
      temperature: opts.temperature ?? 0.7,
      messages,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// Convenience: force a JSON object response and parse it.
export async function chatJSON<T = unknown>(
  system: string,
  user: string,
  opts: { model?: string; temperature?: number } = {}
): Promise<T> {
  const raw = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { ...opts, jsonMode: true }
  );
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some models wrap JSON in prose/fences — salvage the first {...} or [...].
    const match = raw.match(/[[{][\s\S]*[\]}]/);
    if (!match) throw new Error(`LLM did not return JSON: ${raw.slice(0, 300)}`);
    return JSON.parse(match[0]) as T;
  }
}

/* --------------------------------------------------------------- vision */

export type VisionPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/**
 * One-shot vision call: a system prompt, some text, and an image.
 *
 * The image is passed as a data URI rather than a URL, so it works with a
 * private storage bucket and never requires making a photo of Kaleb's food
 * publicly readable to have it analysed.
 *
 * `model` must be a vision-capable model; the default OPENROUTER_MODEL
 * (gemini-2.5-flash) is.
 */
export async function vision(
  opts: {
    system?: string;
    prompt: string;
    /** Raw image bytes plus its mime type. */
    image: { base64: string; mime: string };
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  },
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const parts: VisionPart[] = [
    { type: "text", text: opts.prompt },
    { type: "image_url", image_url: { url: `data:${opts.image.mime};base64,${opts.image.base64}` } },
  ];

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://kalebos.app",
      "X-Title": "Kaleb OS Fuel",
    },
    body: JSON.stringify({
      model: opts.model || LLM_MODEL,
      temperature: opts.temperature ?? 0.2,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: parts },
      ],
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter vision ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
