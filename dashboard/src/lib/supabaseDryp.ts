import { createClient } from "@supabase/supabase-js";

const url = process.env.DRYP_SUPABASE_URL!;
const key = process.env.DRYP_SUPABASE_KEY!;

export const supabaseDryp = createClient(url, key);
