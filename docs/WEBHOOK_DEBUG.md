# WhatsApp webhook auto-reply — debugging guide

## Flow

```
User WhatsApp message
  → Meta POST /api/webhooks/whatsapp
  → Signature verify (if WHATSAPP_APP_SECRET set)
  → Process + send reply, then HTTP 200 (default — reliable on Vercel)
  → parseIncomingWebhook()
  → Save to Inbox (Supabase service role)
  → runAutoReplyEngine()  (flow/rules → AI → env fallback)
  → sendWhatsAppMessage()  (Graph API)
```

## Vercel logs

Filter runtime logs for prefix:

```
[whatsapp-webhook]
```

Stages:

| Log | Meaning |
|-----|---------|
| `post_hit` | Meta reached your server |
| `signature_ok` / `signature_rejected` | App secret check |
| `incoming_payload` | Parsed summary (no message bodies) |
| `inbound_message` | Customer message received |
| `ai_reply_start` / `ai_reply_success` | OpenRouter called |
| `outgoing_reply_request` | Sending to Graph API |
| `outgoing_reply_success` | WhatsApp accepted reply |
| `auto_reply_skipped` | No rule matched — see `reason` |

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `WHATSAPP_PHONE_ID` | Yes | Phone number ID from Meta API Setup |
| `WHATSAPP_TOKEN` | Yes | Permanent access token |
| `WHATSAPP_APP_SECRET` | Production | Meta signature verification |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Meta webhook verify (GET) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Save messages + reply |
| `OPENROUTER_API_KEY` | For AI | AI auto-reply |
| `WHATSAPP_FALLBACK_REPLY` | Optional | Text when no rule/AI matches |
| `WEBHOOK_ASYNC_PROCESSING` | Optional | `true` = fast 200 only (may drop replies on serverless — not recommended) |

## Testing steps

### 1. Meta webhook verification (GET)

Meta Console → Webhook → Verify. Or:

```bash
curl "https://YOUR_APP/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

Expect body: `test123`

### 2. Internal simulate (dashboard)

**Webhook test** → **Run internal test** — bypasses Meta signature; uses env phone ID.

### 3. Live HTTP simulate (same path as Meta)

**Webhook test** → **POST to live endpoint** — includes `X-Hub-Signature-256` when app secret is set.

### 4. Real WhatsApp message

1. Open **Webhook test** → **Live monitor** (ON).
2. Send `Hi` from an allowed test number (Development mode).
3. Confirm **Last Meta call** updates.
4. Check **Recent Meta webhook calls** for `sent | ai` or `signature_rejected`.

### 5. Sync mode (full JSON response)

Processing is **synchronous by default** (reply sent before HTTP 200). For debugging, send header `X-Webhook-Sync: 1` on POST to `/api/webhooks/whatsapp`.

### 6. Verify send API manually

From Meta API Setup, confirm **Phone number ID** equals `WHATSAPP_PHONE_ID` on Vercel.

Check Vercel logs for `outgoing_reply_failed` — often token expired or wrong phone ID.

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Internal test OK, real fails | Signature or wrong server env | Match `WHATSAPP_APP_SECRET` on Vercel; redeploy |
| `signature_rejected` in Recent calls | Wrong app secret | Meta → Basic → App secret → Vercel |
| `Last Meta call: Never` | Wrong callback URL | `https://YOUR_DOMAIN/api/webhooks/whatsapp` |
| Message in Inbox, no WhatsApp reply | `auto_reply_skipped` or send error | AI ON, Away OFF, check logs |
| `status_only_payload` | Not a message event | Subscribe to **messages** field in Meta |

## AI integration

Reply logic lives in `services/auto-reply-engine/` and DB flows. Swap `generateAiReply()` in `services/ai.service.ts` to use another provider without changing the webhook route.
