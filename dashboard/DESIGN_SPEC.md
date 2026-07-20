# Kaleb OS — Design System (from Kaleb's mockup, 2026-07-19)

Premium, dark, OLED-first. "Dark. Focused. Premium. · Minimal clicks. Maximum
clarity. · Information at a glance. · Built for speed and execution. · Everything
has a purpose."

## Foundations
- **Background:** near-pure black `#050507` (OLED). Cards float on it.
- **Surfaces:** card `#0f0f14`, raised `#16161d`, input/segment-active `#1c1c25`.
- **Borders:** hairline `#1e1e27` (barely-there), stronger `#2a2a35`.
- **Accent:** violet `#8b5cf6` → gradient `linear-gradient(135deg,#a855f7,#6366f1)`.
- **Text:** primary `#f4f4f7`, secondary `#a0a0ad`, muted `#63636f`.
- **Radii:** cards 18px, tiles 16px, gradient icons 16px, pills 10–12px, tags 6px.
- **Type:** Inter/SF Pro. Titles 25–28px/800. Section labels 10px/700 uppercase, 0.12em tracking, muted. Body 13–14px.

## Six-Pillar color system (canonical — used for tags, bars, icons)
| Pillar | Color |
|---|---|
| Spirit | `#a78bfa` violet |
| Mind | `#60a5fa` blue |
| Body | `#34d399` green |
| Money | `#fbbf24` amber |
| Mission | `#fb923c` orange |
| Relationships | `#f472b6` pink |

Each pillar renders as a **gradient rounded-square icon** (2-tone of its color) and a small **uppercase tag** on schedule/list rows.

## Core components
- **Gradient icon tile:** rounded square (56px on grids, ~40px inline), 2-color gradient of the pillar/feature, white glyph centered. Optional red count badge top-right.
- **Stat tile:** big number (28px/800, colored), tiny uppercase label above/below, muted sublabel. Used in 3-up rows (Consistency / Tasks / Cash).
- **Section label:** 10px uppercase muted, above every group.
- **Segmented control:** dark pill container, active segment = raised surface + white text (Day/Week/Month, Capture/Entries/Insights, Week/Month/Year).
- **Timeline row (Schedule):** left colored pillar bar (3px) · time range · bold title · muted detail · pillar tag top-right.
- **List row (Insights/Habits):** small gradient icon · label · right-aligned value (✓ green, "2/3", "7 in a row 🔥").
- **Mini charts:** single-accent line or bars, no axes/gridlines (consistency line, trading bars, sleep bars, energy line).
- **Bottom tab bar:** 5 tabs — Home · Schedule · Atlas · Journal · More — icon + 10px label, active = violet.

## The 8 screens
1. **Brand/cover** — "KALEB OS" (OS in violet), tagline "Your Life. Organized. Optimized. Aligned.", signature, 6-pillar list card.
2. **Home (Today)** — "Good morning, Kaleb 👋" + rules line ("Protect the morning. Build in the afternoon. Share in the evening. Reflect before sleep."); TODAY'S FOCUS card; 3 stat tiles (Consistency %/streak · Tasks today · Cash in/month); TODAY'S SCHEDULE list (time · name · pillar tag).
3. **Schedule** — Day/Week/Month segmented; date nav ‹ Today ›; full timeline with pillar bars + tags + details.
4. **Atlas (command center)** — gradient app grid (Trading/Ventures/Goals/Projects); EXECUTION (Tasks w/ badge, Reviews); INSIGHTS list (Streaks/Patterns/Performance/Opportunities).
5. **Journal** — Capture/Entries/Insights segmented; VOICE JOURNAL waveform + timer + big mic; SMART PROMPTS list (What did I learn? / challenged me? / grateful for? / who did I become? / tomorrow?).
6. **Daily Briefing** — OVERVIEW (sunrise/weather/meetings/focus); TOP 3 PRIORITIES (numbered); REMINDERS.
7. **Habits** — S M T W T F S header; habit rows w/ icon + ✓ or progress ("2/3", "180g/180g", "45m/60m").
8. **Insights** — Week/Month/Year; stat cards w/ mini charts: Consistency 97% (line), Trading +$1,485 (bars), Sleep 7h32m (bars), Energy 8.4/10 (line).

## Rollout order
1. ✅ Design tokens + component classes (globals.css)
2. ✅ Home (Today) — flagship proof
3. Tab bar → Home/Schedule/Atlas/Journal/More premium style
4. Schedule polish · Atlas command center · Daily Briefing (+ Phase 2 backend) · Insights · Habits (new) · Journal (new)
