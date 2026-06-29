# n8n workflows — RETIRED (2026-06-29)

Both capture workflows have been replaced. The Hetzner VPS + n8n are being
decommissioned (the "always-on brain = Claude Routines, no VPS" decision).

## capture-gmail.json → Claude Routine
- **Replaced by:** Routine "Kaleb OS · Gmail Capture" (`trig_01YRXSbx1QXv2SkUgBAVjV33`,
  hourly) using the claude.ai Gmail connector → `POST /api/ingest/gmail`.
- Manage: https://claude.ai/code/routines/trig_01YRXSbx1QXv2SkUgBAVjV33
- Endpoint: `dashboard/src/app/api/ingest/gmail/route.ts` (upserts to raw_captures,
  dedup on source+source_id — identical behavior to the old HTTP node).

## capture-plaud.json → on-device MCP pipe
- **Replaced by:** the PLAUD auto-pipe. PLAUD's MCP is a *local* server (not a
  claude.ai connector), so it CANNOT run in a cloud Routine. It runs from a Claude
  client via the `plaud-sync` skill (`/plaud-sync` or `/loop 30m /plaud-sync`)
  → `POST /api/ingest/plaud` (dedup ledger `plaud_ingested`).
- The old webhook was already dormant (last fired 2026-05-11).

## To finish decommissioning the VPS
1. In the n8n UI (n8n.kalebos.app), disable/delete both workflows.
2. Confirm the Gmail Routine is writing (raw_captures gmail rows keep growing).
3. Power down / delete the Hetzner CPX11 box. Nothing else depends on it
   (Hermes daemon there is already dormant).

The JSON files are kept only as historical reference.
