// Pure time helpers — no DB imports, so they're safe to bundle into client
// components (the live home timeline ticks off these every second).

export const TZ = "America/New_York";

export const PILLAR_COLORS: Record<string, string> = {
  Spirit: "#a78bfa",
  Mind: "#60a5fa",
  Body: "#34d399",
  Money: "#fbbf24",
  Mission: "#fb923c",
  Relationships: "#f472b6",
};

// Minutes since midnight in ET, right now (or for a given Date).
export function etNowMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

export function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
