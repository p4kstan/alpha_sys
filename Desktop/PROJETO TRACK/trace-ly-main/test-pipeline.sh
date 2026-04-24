#!/usr/bin/env bash
# ============================================================
# CapiTrack – End-to-end pipeline test
# Tests: QuantumPay → gateway-webhook → event-router →
#        event_queue → process-events → Google Ads / GA4
#
# Usage:
#   bash test-pipeline.sh [USER_JWT]
#
# USER_JWT: Bearer token from CapiTrack (Settings → API Token).
# If omitted, read from env var CAPITRACK_JWT.
# ============================================================
set -euo pipefail

PROJECT="xpgsipmyrwyjerjvbhmb"
BASE="https://${PROJECT}.supabase.co/functions/v1"
WORKSPACE="b477d45c-263b-4b29-befb-a43dd13c97d8"
JWT="${1:-${CAPITRACK_JWT:-}}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
fail() { echo -e "${RED}✗ $*${NC}"; }
info() { echo -e "${CYAN}→ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }

if [ -z "$JWT" ]; then
  echo "Usage: bash test-pipeline.sh <USER_JWT>"
  echo "  Get your JWT: CapiTrack → Settings → API Token"
  exit 1
fi

AUTH="Authorization: Bearer $JWT"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZ3NpcG15cnd5amVyanZiaG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDcxNzAsImV4cCI6MjA5MTUyMzE3MH0.Wmp54JGfcIrTrRakhlVsD6uMNhh09dgllf88QPruKI0"

# ─── STEP 1: Send test QuantumPay webhook ────────────────────
echo ""
info "STEP 1 — Sending test QuantumPay transaction_paid webhook..."

# Simulate a real PIX payment with gclid in metadata
EVENT_ID="test-$(date +%s%N | md5sum | head -c 16)"
ORDER_ID="QP-TEST-$(date +%s)"
TEST_GCLID="CjwKCAjwhqfPBhBWEiwAZo196TEST_GCLID_FOR_PIPELINE_TESThoCNeEQAvD_BwE"
TEST_VALUE=4990   # R$ 49,90 in centavos

PAYLOAD=$(cat <<JSON
{
  "event": "transaction_paid",
  "transaction": {
    "id": "${ORDER_ID}",
    "status": "paid",
    "amount": ${TEST_VALUE},
    "metadata": {
      "event_id": "${EVENT_ID}",
      "gclid": "${TEST_GCLID}",
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "test-marmitex-cpa",
      "utm_term": "marmitex delivery",
      "customer": {
        "name": "Teste Pipeline",
        "email": "pipeline-test@capitrack.test",
        "phone": "11999999999",
        "document": "12345678900"
      }
    }
  }
}
JSON
)

# Call gateway-webhook (QuantumPay has no secret configured = HMAC skipped)
WEBHOOK_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE}/gateway-webhook" \
  -H "Content-Type: application/json" \
  -H "x-gateway-provider: quantumpay" \
  -H "x-workspace-id: ${WORKSPACE}" \
  -H "apikey: ${ANON_KEY}" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$WEBHOOK_RESP" | tail -1)
BODY=$(echo "$WEBHOOK_RESP" | head -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  ok "gateway-webhook accepted (HTTP $HTTP_CODE)"
  EVENT_DB_ID=$(echo "$BODY" | grep -o '"event_id":"[^"]*"' | cut -d'"' -f4)
  info "Event DB ID: ${EVENT_DB_ID:-<check logs>}"
else
  fail "gateway-webhook failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

# ─── STEP 2: Trigger event-router ────────────────────────────
echo ""
info "STEP 2 — Triggering event-router for the new event..."
sleep 1

if [ -n "${EVENT_DB_ID:-}" ]; then
  ROUTER_RESP=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE}/event-router" \
    -H "Content-Type: application/json" \
    -H "$AUTH" \
    -H "apikey: ${ANON_KEY}" \
    -d "{\"event_id\": \"${EVENT_DB_ID}\", \"workspace_id\": \"${WORKSPACE}\"}")

  ROUTER_HTTP=$(echo "$ROUTER_RESP" | tail -1)
  ROUTER_BODY=$(echo "$ROUTER_RESP" | head -1)

  if [ "$ROUTER_HTTP" = "200" ]; then
    ok "event-router routed successfully (HTTP 200)"
    ROUTES=$(echo "$ROUTER_BODY" | grep -o '"provider":"[^"]*","status":"[^"]*"' | head -5)
    info "Routes: $ROUTES"
    STATUS=$(echo "$ROUTER_BODY" | grep -o '"processing_status":"[^"]*"' | cut -d'"' -f4)
    if [ "$STATUS" = "queued" ] || [ "$STATUS" = "delivered" ]; then
      ok "Processing status: $STATUS"
    else
      warn "Processing status: $STATUS (expected 'queued' or 'delivered')"
    fi
  else
    fail "event-router failed (HTTP $ROUTER_HTTP)"
    echo "Response: $ROUTER_BODY"
  fi
else
  warn "No event_id from step 1 — skipping event-router call"
fi

# ─── STEP 3: Trigger process-events ──────────────────────────
echo ""
info "STEP 3 — Triggering process-events worker..."
sleep 2

PROCESS_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE}/process-events" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"workspace_id\": \"${WORKSPACE}\", \"limit\": 50}")

PROCESS_HTTP=$(echo "$PROCESS_RESP" | tail -1)
PROCESS_BODY=$(echo "$PROCESS_RESP" | head -1)

if [ "$PROCESS_HTTP" = "200" ]; then
  ok "process-events completed (HTTP 200)"
  DELIVERED=$(echo "$PROCESS_BODY" | grep -o '"delivered":[0-9]*' | cut -d: -f2)
  FAILED=$(echo "$PROCESS_BODY" | grep -o '"failed":[0-9]*' | cut -d: -f2)
  PROCESSED=$(echo "$PROCESS_BODY" | grep -o '"processed":[0-9]*' | cut -d: -f2)
  info "Processed: ${PROCESSED:-?}  Delivered: ${DELIVERED:-?}  Failed: ${FAILED:-?}"
  if [ "${DELIVERED:-0}" -gt 0 ] 2>/dev/null; then
    ok "Conversions delivered to providers"
  elif [ "${PROCESSED:-0}" -eq 0 ] 2>/dev/null; then
    warn "Queue was empty — event may have been delivered inline (fire-and-forget)"
  else
    fail "Items processed but none delivered — check Google Ads OAuth"
  fi
else
  fail "process-events failed (HTTP $PROCESS_HTTP)"
  echo "Response: $PROCESS_BODY"
fi

# ─── STEP 4: Check integration_logs ──────────────────────────
echo ""
info "STEP 4 — Checking integration logs (last 5 entries)..."

LOGS_RESP=$(curl -s -w "\n%{http_code}" \
  -X GET "${BASE/functions\/v1/rest\/v1}/integration_logs?workspace_id=eq.${WORKSPACE}&order=created_at.desc&limit=5&select=provider,event_name,status,error_message,created_at" \
  -H "apikey: ${ANON_KEY}" \
  -H "$AUTH")

LOGS_HTTP=$(echo "$LOGS_RESP" | tail -1)
LOGS_BODY=$(echo "$LOGS_RESP" | head -1)

if [ "$LOGS_HTTP" = "200" ]; then
  echo "$LOGS_BODY" | python3 -c "
import json, sys
rows = json.load(sys.stdin)
if not rows:
    print('\033[33m  No logs found\033[0m')
else:
    for r in rows:
        status = r.get('status','?')
        color = '\033[32m' if status == 'delivered' else '\033[31m'
        print(f\"  {color}{status}\033[0m  {r.get('provider','?'):15} {r.get('event_name','?'):20} {r.get('error_message') or ''}\")
" 2>/dev/null || echo "$LOGS_BODY"
else
  warn "Could not fetch integration_logs (HTTP $LOGS_HTTP)"
fi

# ─── STEP 5: Check event_queue status ────────────────────────
echo ""
info "STEP 5 — Checking event_queue (last 5 entries)..."

QUEUE_RESP=$(curl -s -w "\n%{http_code}" \
  -X GET "${BASE/functions\/v1/rest\/v1}/event_queue?workspace_id=eq.${WORKSPACE}&order=created_at.desc&limit=5&select=provider,status,attempt_count,created_at" \
  -H "apikey: ${ANON_KEY}" \
  -H "$AUTH")

QUEUE_HTTP=$(echo "$QUEUE_RESP" | tail -1)
QUEUE_BODY=$(echo "$QUEUE_RESP" | head -1)

if [ "$QUEUE_HTTP" = "200" ]; then
  echo "$QUEUE_BODY" | python3 -c "
import json, sys
rows = json.load(sys.stdin)
if not rows:
    print('\033[33m  Queue empty — all processed\033[0m')
else:
    for r in rows:
        status = r.get('status','?')
        color = '\033[32m' if status in ('delivered','completed') else '\033[33m' if status == 'queued' else '\033[31m'
        print(f\"  {color}{status}\033[0m  {r.get('provider','?'):15} attempts={r.get('attempt_count',0)}  {r.get('created_at','')[:19]}\")
" 2>/dev/null || echo "$QUEUE_BODY"
else
  warn "Could not fetch event_queue (HTTP $QUEUE_HTTP) — may need service role key"
fi

# ─── STEP 6: GA4 ping test ───────────────────────────────────
echo ""
info "STEP 6 — Testing GA4 Measurement Protocol connectivity..."

GA4_PING=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE}/ga4-events" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -H "apikey: ${ANON_KEY}" \
  -d "{\"workspace_id\": \"${WORKSPACE}\", \"items\": [{\"event_name\": \"test_connection\", \"payload_json\": {\"session\": {}, \"order\": {}, \"customer\": {}}}]}")

GA4_HTTP=$(echo "$GA4_PING" | tail -1)
GA4_BODY=$(echo "$GA4_PING" | head -1)
if [ "$GA4_HTTP" = "200" ]; then
  ok "GA4 endpoint reachable (HTTP 200)"
  STATUS=$(echo "$GA4_BODY" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  info "GA4 status: ${STATUS:-see body}"
else
  warn "GA4 check (HTTP $GA4_HTTP) — may need GA4 credentials configured"
fi

# ─── SUMMARY ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo " PIPELINE TEST COMPLETE"
echo "════════════════════════════════════════════"
echo " Test order: $ORDER_ID"
echo " Test gclid: $TEST_GCLID"
echo " Value: R\$ $(echo "scale=2; $TEST_VALUE/100" | bc)"
echo ""
echo " Next: check Google Ads → Conversions → Diagnostics"
echo " in ~24h to confirm the conversion registered."
echo "════════════════════════════════════════════"
