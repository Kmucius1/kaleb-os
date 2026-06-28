// CRM -> Content Engine sync.
// Reads DRYP CRM services (social_media / ads_management) and mirrors those clients
// into the content engine as client brands. Personal/niche brands are never touched.
// CRM is the single source of truth: re-run anytime to stay in sync.

import { supabase } from "./supabase";
import { supabaseDryp } from "./supabaseDryp";

// Which CRM service types make a client a CONTENT client.
export const CONTENT_SERVICE_TYPES = ["social_media", "ads_management"] as const;

const CLIENT_COLORS = ["#3b82f6", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#a855f7", "#84cc16", "#eab308"];

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "client";
}

export interface SyncResult {
  created: string[];
  updated: string[];
  paused: string[];
  skipped: number;
  total_clients: number;
}

export async function syncClientBrands(): Promise<SyncResult> {
  // 1. Pull active content-relevant services from the CRM.
  const { data: services, error: svcErr } = await supabaseDryp
    .from("services")
    .select("account_id, service_type, status")
    .in("service_type", CONTENT_SERVICE_TYPES as unknown as string[]);
  if (svcErr) throw new Error(`CRM services read: ${svcErr.message}`);

  // 2. Group service types per client account (active services only).
  const byAccount = new Map<string, Set<string>>();
  for (const s of services ?? []) {
    if (s.status && s.status !== "active") continue;
    if (!byAccount.has(s.account_id)) byAccount.set(s.account_id, new Set());
    byAccount.get(s.account_id)!.add(s.service_type);
  }

  const accountIds = [...byAccount.keys()];
  const result: SyncResult = { created: [], updated: [], paused: [], skipped: 0, total_clients: accountIds.length };
  if (accountIds.length === 0) return result;

  // 3. Fetch those accounts' names/status.
  const { data: accounts, error: accErr } = await supabaseDryp
    .from("accounts")
    .select("id, business_name, is_active")
    .in("id", accountIds);
  if (accErr) throw new Error(`CRM accounts read: ${accErr.message}`);
  const accById = new Map((accounts ?? []).map((a) => [a.id, a]));

  // 4. Existing client brands we've synced before.
  const { data: existing } = await supabase
    .from("brands").select("id, slug, crm_account_id").not("crm_account_id", "is", null);
  const brandByAccount = new Map((existing ?? []).map((b) => [b.crm_account_id as string, b]));

  let colorIdx = 0;
  for (const [accountId, typeSet] of byAccount) {
    const acc = accById.get(accountId);
    if (!acc) { result.skipped++; continue; }
    const svcArr = [...typeSet];
    const name = (acc.business_name as string).trim();
    const status = acc.is_active ? "active" : "paused";

    const found = brandByAccount.get(accountId);
    if (found) {
      await supabase.from("brands").update({
        name, services: svcArr, status, source: "crm_sync", updated_at: new Date().toISOString(),
      }).eq("id", found.id);
      (status === "paused" ? result.paused : result.updated).push(name);
    } else {
      // New client brand — derive a unique slug.
      let slug = slugify(name);
      const { data: clash } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
      if (clash) slug = `${slug}-${accountId.slice(0, 4)}`;
      await supabase.from("brands").insert({
        slug, name, kind: "client", company: name,
        crm_account_id: accountId, services: svcArr, source: "crm_sync",
        status, managed: true, color: CLIENT_COLORS[colorIdx++ % CLIENT_COLORS.length],
        default_collab_with: [], pillars: [],
      });
      result.created.push(name);
    }
  }
  return result;
}

// Live CRM context for grounding a client's content (what we're actually doing for them).
export async function getClientContext(crmAccountId: string) {
  const [{ data: account }, { data: services }, { data: projects }] = await Promise.all([
    supabaseDryp.from("accounts").select("business_name, industry, health_status, is_active").eq("id", crmAccountId).single(),
    supabaseDryp.from("services").select("service_type, name, status").eq("account_id", crmAccountId),
    supabaseDryp.from("projects").select("name, project_type, phase, status").eq("account_id", crmAccountId),
  ]);
  return { account, services: services ?? [], projects: projects ?? [] };
}
