#!/usr/bin/env bash
# Apply a SQL migration to the KalebOS Supabase project via the Management API.
# Requires SUPABASE_ACCESS_TOKEN (a personal access token, sbp_...) in dashboard/.env.local.
# Usage: scripts/apply-migration.sh supabase/migrations/0005_content_engine.sql
set -euo pipefail

REF="${SUPABASE_PROJECT_REF:-eafrjiqjelumqgoefbfd}"   # KalebOS
ENV_FILE="$(dirname "$0")/../dashboard/.env.local"
SQL_FILE="${1:?Usage: apply-migration.sh <path-to.sql>}"

TOKEN="$(grep -E '^SUPABASE_ACCESS_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"
if [ -z "${TOKEN:-}" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN not found in $ENV_FILE" >&2
  echo "Get one at https://supabase.com/dashboard/account/tokens (logged into the KalebOS account)" >&2
  exit 1
fi

# Send the SQL as a JSON-encoded string (jq for safe escaping).
PAYLOAD="$(jq -Rs '{query: .}' < "$SQL_FILE")"

echo "Applying $SQL_FILE to project $REF ..."
HTTP=$(curl -sS -o /tmp/sb_migrate_out.json -w "%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [ "$HTTP" = "200" ] || [ "$HTTP" = "201" ]; then
  echo "✅ Applied (HTTP $HTTP)."
  cat /tmp/sb_migrate_out.json
else
  echo "❌ Failed (HTTP $HTTP):" >&2
  cat /tmp/sb_migrate_out.json >&2
  exit 1
fi
