import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// TradePrint (trading journal) — read into Kaleb OS. Needs the SERVICE ROLE key
// (rows are RLS-scoped per user). Lazy init so the app doesn't crash before it's connected.
let client: SupabaseClient | null = null;

export function tradePrintClient(): SupabaseClient {
  const url = process.env.TRADEPRINT_SUPABASE_URL;
  const key = process.env.TRADEPRINT_SUPABASE_KEY;
  if (!url || !key) throw new Error("TradePrint not connected (set TRADEPRINT_SUPABASE_URL / TRADEPRINT_SUPABASE_KEY)");
  if (!client) client = createClient(url, key);
  return client;
}
