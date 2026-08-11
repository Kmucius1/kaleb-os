import { supabase } from "./supabase";
import { todayET } from "./tasks";

// The nav badge. It used to count every pending row, which meant it read "306" —
// a number that tells you nothing except that the system is drowning. It now
// counts only what the Now bucket contains: Kaleb's own tasks that are either
// scored 7+ or already due. Untriaged rows are excluded on purpose; a badge that
// counts things nobody has judged is the problem it's supposed to solve.
export async function countTasksNow(): Promise<{ count: number }> {
  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "in_progress"])
    .eq("owner", "kaleb")
    .or(`priority.gte.7,due_date.lte.${todayET()}`);
  return { count: count ?? 0 };
}
