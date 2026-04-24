# CapiTrack AI Optimization Agent

## Setup (one-time)

### 1. Generate MCP Token
```bash
curl -X POST https://xpgsipmyrwyjerjvbhmb.supabase.co/functions/v1/mcp/token \
  -H "Authorization: Bearer <YOUR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "b477d45c-263b-4b29-befb-a43dd13c97d8",
    "label": "ai-bidding-agent",
    "permissions": ["read", "write"]
  }'
# Save the returned token — shown only once.
```

### 2. Configure Claude as MCP Client
Add to your claude_desktop_config.json or Claude Code MCP settings:
```json
{
  "mcpServers": {
    "capitrack": {
      "url": "https://xpgsipmyrwyjerjvbhmb.supabase.co/functions/v1/mcp",
      "headers": {
        "x-mcp-token": "<YOUR_MCP_TOKEN>"
      }
    }
  }
}
```

---

## Optimization Prompt (use with Claude + MCP)

Paste this prompt to Claude with the CapiTrack MCP connected:

```
You are a Google Ads CPA optimizer for a Brazilian food delivery business (marmitex).
Goal: minimize CPA (cost per acquisition) and maximize conversion volume.

Use the CapiTrack MCP tools to:

1. READ analytics.get_enriched_conversions (last 30 days)
   → Identify which gclids converted and which keywords drove them.

2. READ analytics.get_keyword_behavior (last 30 days)
   → Find keywords with high scroll/dwell but ZERO conversions.
   → Find keywords with conversion_rate > 2x workspace average.

3. READ analytics.get_roi_snapshot
   → Identify channels with ROAS < 1.0 (spending more than earning).
   → Identify channels with ROAS > 3.0 (scale these).

4. DECIDE and EXECUTE:
   - Pause keywords with 0 conversions AND >50 clicks (budget waste).
   - Reduce bids -30% on keywords with CPA > 2x target CPA.
   - Increase bids +20% on keywords with CPA < 0.5x target CPA and >3 conversions.
   - Add negative keywords for terms with 0 conversions and >100 impressions.
   - Increase budget +25% on campaigns with ROAS > 4.0.
   - Pause campaigns with spend >R$50 and 0 conversions in last 7 days.

5. READ system.get_performance to confirm queue health before and after.

6. Report:
   - How many keywords paused / bid changed
   - Estimated monthly savings
   - Highest-converting keywords to scale
   - Recommended new negative keywords list

Target CPA: R$ 25,00
Target ROAS: 3.0x (R$3 revenue per R$1 spent)
```

---

## Automated Daily Optimization (Supabase pg_cron)

Run this SQL in Supabase SQL Editor to trigger the agent daily at 06:00 BRT:

```sql
-- Requires pg_cron extension (enabled by default in Supabase)
SELECT cron.schedule(
  'daily-cpa-optimization',
  '0 9 * * *',  -- 09:00 UTC = 06:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://xpgsipmyrwyjerjvbhmb.supabase.co/functions/v1/mcp',
    headers := '{"Content-Type":"application/json","x-mcp-token":"<YOUR_MCP_TOKEN>"}',
    body := '{
      "jsonrpc":"2.0","method":"tools/call","id":1,
      "params":{
        "name":"analytics.get_keyword_behavior",
        "arguments":{"workspace_id":"b477d45c-263b-4b29-befb-a43dd13c97d8","days":7}
      }
    }'
  ) AS request_id;
  $$
);
```

---

## Available MCP Tools

### Read Tools
| Tool | What it returns |
|------|----------------|
| `analytics.get_enriched_conversions` | Conversions + gclid + keyword + UTM (last N days) |
| `analytics.get_roi_snapshot` | Revenue per channel, ROAS, attribution |
| `analytics.get_keyword_behavior` | Scroll/dwell/CTA events per UTM keyword |
| `analytics.get_conversions` | Raw conversion list with values |
| `queue.get_status` | event_queue health (queued/failed/dead_letter counts) |
| `deliveries.get_failed` | Failed delivery items for diagnosis |
| `system.get_performance` | Throughput, latency, error rates |

### Write Tools (require 'write' permission)
| Tool | What it does |
|------|-------------|
| `keywords.update_bid` | Change CPC bid for a specific keyword |
| `keywords.set_status` | Pause / enable a keyword |
| `campaigns.update_budget` | Change daily budget |
| `campaigns.pause` / `campaigns.resume` | Pause or resume a campaign |
| `ad_groups.update_bid` | Change ad group default bid |
| `negative_keywords.add` | Add negative keyword to campaign/ad group |
| `bid_modifiers.update` | Adjust bid modifier (device, location, audience) |

All write actions are logged to `automation_actions` table with before/after values.
