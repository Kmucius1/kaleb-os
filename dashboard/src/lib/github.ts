import { supabase } from "./supabase";

// Live view of Kaleb's GitHub portfolio, organized so "what am I working on
// vs not" is obvious. Raw signal = last push (git activity). On top of that,
// Kaleb's own label (project_status table) wins when he sets one.

const GH_USER = "Kmucius1";

export type Activity = "active" | "warm" | "dormant";
export type ManualStatus = "working" | "live" | "shelved" | "idea";

export type Project = {
  repo: string; // full_name
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  isPrivate: boolean;
  archived: boolean;
  pushedAt: string;
  daysSincePush: number;
  activity: Activity;
  status: ManualStatus | null;
  pinned: boolean;
  note: string | null;
};

type GhRepo = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
};

function activityOf(days: number): Activity {
  if (days <= 14) return "active";
  if (days <= 45) return "warm";
  return "dormant";
}

export async function getProjects(): Promise<Project[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];

  const [repos, { data: overrides }] = await Promise.all([
    fetchAllRepos(token),
    supabase.from("project_status").select("*"),
  ]);

  const byRepo = new Map<string, { status?: ManualStatus; pinned?: boolean; note?: string }>(
    (overrides ?? []).map((o: any) => [o.repo, { status: o.status, pinned: o.pinned, note: o.note }]),
  );

  const now = Date.now();
  return repos
    .filter((r) => !r.fork)
    .map((r): Project => {
      const days = Math.floor((now - new Date(r.pushed_at).getTime()) / 86400000);
      const ov = byRepo.get(r.full_name);
      return {
        repo: r.full_name,
        name: r.name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        isPrivate: r.private,
        archived: r.archived,
        pushedAt: r.pushed_at,
        daysSincePush: days,
        activity: activityOf(days),
        status: ov?.status ?? null,
        pinned: ov?.pinned ?? false,
        note: ov?.note ?? null,
      };
    })
    .sort((a, b) => a.daysSincePush - b.daysSincePush);
}

async function fetchAllRepos(token: string): Promise<GhRepo[]> {
  const all: GhRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `https://api.github.com/user/repos?affiliation=owner&per_page=100&sort=pushed&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 900 }, // 15 min
      },
    );
    if (!res.ok) break;
    const batch = (await res.json()) as GhRepo[];
    // Only Kaleb's own repos (defensive — affiliation=owner should already scope this).
    all.push(...batch.filter((r) => r.full_name.startsWith(`${GH_USER}/`)));
    if (batch.length < 100) break;
  }
  return all;
}
