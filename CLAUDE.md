# Kaleb OS (Hermes)

Personal AI command center. Hermes is Kaleb's always-on strategic operator — surfaces content ideas, tracks business leads, monitors trading, and manages life optimization workflows.

## Stack
- n8n (self-hosted on Hetzner VPS) for automation workflows
- Supabase for data persistence
- Docker Compose for local/VPS orchestration
- Domain: kalebos.app (Cloudflare)
- n8n at: n8n.kalebos.app

## Repo structure
- `docker-compose.yml` — n8n service definition
- `n8n-workflows/` — Exported n8n workflow JSONs (capture-gmail, capture-plaud)
- `supabase/migrations/` — DB schema migrations
- `prompts/` — Hermes system prompts
- `decisions.md` — Locked architectural/behavioral decisions (source of truth)
- `dashboard/` — Dashboard UI (if any)

## Locked decisions (from decisions.md)
- Email send requires explicit approval click — no auto-send ever
- Temporary memory TTL: 60 days, auto-renews +30 days on reference
- Hermes notifies 7am–9pm Eastern only; outside hours = queue
- Anthropic API hard cap: $100/mo (Phase 1–3), alert at $30/mo
- OpenAI API (embeddings only) hard cap: $20/mo

## Hermes voice
High-level strategic operator. Clear, structured, direct — not emotional. Every output: what's happening → what matters → what to do next (with recommendation + options). Prioritizes: business profit → trading → brand growth → life optimization.

## Key notes
- Read `decisions.md` before proposing any architectural changes — many decisions are locked
- The one outcome (month 3): Hermes consistently surfaces content ideas, drafts posts, and tracks which content converts followers into business leads
- Build phases tracked in project memory
