import { createClient } from "@supabase/supabase-js";

// DRYP Ledger (accounting) — read + edit from Kaleb OS.
const url = process.env.LEDGER_SUPABASE_URL!;
const key = process.env.LEDGER_SUPABASE_KEY!;

export const supabaseLedger = createClient(url, key);
