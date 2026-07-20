// Server-side PLAUD client. Lets a Vercel cron pull recordings with NO laptop /
// MCP / Claude session. IMPORTANT: PLAUD refresh tokens are 7-day JWTs that
// ROTATE on each refresh — the endpoint returns a fresh refresh_token. So we
// store the live token in kalebos_config.plaud_refresh_token and persist the
// rotated one every run: as long as the cron fires within 7 days (every 30 min),
// it rolls forward forever. PLAUD_REFRESH_TOKEN env is only the initial seed.
// API surface mirrors @plaud-ai/mcp: platform.plaud.ai/developer/api/open/third-party.
import { supabase } from "./supabase";

const API = "https://platform.plaud.ai/developer/api";
const REFRESH_URL = `${API}/oauth/third-party/access-token/refresh`;
const BASE = `${API}/open/third-party`;
const RT_KEY = "plaud_refresh_token";

async function getRefreshToken(): Promise<string> {
  const { data } = await supabase.from("kalebos_config").select("value").eq("key", RT_KEY).maybeSingle();
  const t = (data?.value || process.env.PLAUD_REFRESH_TOKEN || "").trim();
  if (!t) throw new Error("PLAUD refresh token not set (kalebos_config or env)");
  return t;
}

// Mint a fresh 24h access token AND persist the rotated refresh token.
export async function plaudAccessToken(): Promise<string> {
  const rt = await getRefreshToken();
  const res = await fetch(REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ refresh_token: rt }),
  });
  if (!res.ok) throw new Error(`PLAUD token refresh failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("PLAUD refresh returned no access_token");
  // Roll the refresh token forward so it never expires while the cron runs.
  if (data.refresh_token && data.refresh_token !== rt) {
    await supabase.from("kalebos_config").upsert({ key: RT_KEY, value: data.refresh_token }, { onConflict: "key" });
  }
  return data.access_token as string;
}

// Fetch helper that keeps the Authorization header across PLAUD's trailing-slash
// 307 redirects (node fetch otherwise drops it → 401).
async function plaudGet(token: string, path: string): Promise<Response> {
  let url = `${BASE}${path}`;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) { url = loc.startsWith("http") ? loc : `${API.replace("/developer/api", "")}${loc}`; continue; }
    }
    return res;
  }
  throw new Error("too many redirects");
}

export type PlaudFile = { id: string; name: string; start_at?: string; created_at?: string; duration?: number };

export async function plaudListFiles(token: string, pageSize = 30, page = 1): Promise<PlaudFile[]> {
  const res = await plaudGet(token, `/files/?page=${page}&page_size=${pageSize}`);
  if (!res.ok) throw new Error(`PLAUD list failed: ${res.status}`);
  const data = await res.json();
  return (data?.data ?? []) as PlaudFile[];
}

// Returns the recording's full transcript text (+ AI summary when present), the
// same content the MCP's get_transcript surfaces — pulled from source_list/note_list.
export async function plaudTranscript(token: string, fileId: string): Promise<string> {
  const res = await plaudGet(token, `/files/${fileId}`);
  if (!res.ok) throw new Error(`PLAUD getFile failed: ${res.status}`);
  const file = await res.json();

  const parts: string[] = [];
  for (const s of (file.source_list ?? []) as { data_content?: string }[]) {
    const raw = s.data_content;
    if (!raw) continue;
    try {
      const segs = JSON.parse(raw);
      if (Array.isArray(segs)) {
        const text = segs.map((x: { content?: string }) => x?.content ?? "").filter(Boolean).join(" ").trim();
        if (text) parts.push(text);
        continue;
      }
    } catch { /* not JSON — use as-is */ }
    if (typeof raw === "string" && raw.trim()) parts.push(raw.trim());
  }
  // Fall back to / supplement with the AI summary note.
  const summary = ((file.note_list ?? []) as { data_title?: string; data_content?: string }[])
    .find(n => /summary/i.test(n.data_title ?? ""))?.data_content;

  let out = parts.join("\n").trim();
  if (summary?.trim()) out += `\n\n[PLAUD summary]\n${summary.trim()}`;
  return out.trim();
}
