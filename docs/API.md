# Basic Message API

Send a customer message and get an automatic WhatsApp reply (same engine as the live webhook).

## Endpoint

**POST** `/api/v1/message`

**GET** `/api/v1/message` — returns this documentation as JSON.

## Authentication

Either:

1. **Dashboard login** — browser session cookie while logged in, or  
2. **API key** — header `X-API-Key: <PORTAL_API_KEY>` (set in Vercel / `.env.local`)

Optional: `PORTAL_BUSINESS_ID` = UUID of your `businesses` row (otherwise first business is used with API key).

## Request body

```json
{
  "phone": "919876543210",
  "message": "Hi, I need help",
  "contactName": "Rahul"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `phone` | Yes | Customer number with country code (digits) |
| `message` | Yes | Text they sent |
| `contactName` | No | Display name in Inbox (default: Customer) |

## Response

```json
{
  "ok": true,
  "businessId": "...",
  "inbound": { "phone": "919876543210", "message": "Hi, I need help" },
  "outbound": {
    "reply": "Thanks for reaching out! A team member will follow up shortly.",
    "source": "fallback",
    "sentToWhatsApp": true,
    "whatsAppMessageId": "wamid...."
  },
  "conversationId": "...",
  "skippedReason": null,
  "error": null
}
```

`outbound.source` can be: `ai`, `fallback`, `env_fallback`, `welcome`, `away`, `keyword`, `handoff`, `none`.

## Example (curl)

```bash
curl -X POST "https://wa-bot-portal.vercel.app/api/v1/message" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-portal-api-key" \
  -d "{\"phone\":\"919876543210\",\"message\":\"Hello\"}"
```

Local:

```bash
curl -X POST "http://localhost:3000/api/v1/message" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-portal-api-key" \
  -d "{\"phone\":\"919876543210\",\"message\":\"Hello\"}"
```

## Required server env

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_PHONE_ID` | Send reply on WhatsApp |
| `WHATSAPP_TOKEN` | Send reply on WhatsApp |
| `SUPABASE_SERVICE_ROLE_KEY` | Save Inbox messages |
| `OPENROUTER_API_KEY` | AI replies (optional if AI off → thanks message) |
| `PORTAL_API_KEY` | External API access |

## Related endpoints

| Endpoint | Use |
|----------|-----|
| `POST /api/webhooks/whatsapp` | Meta production webhook |
| `POST /api/ai-bot/chat` | AI text only, no WhatsApp (login required) |
| `POST /api/setup/webhook-test` | Admin simulate (login required) |
