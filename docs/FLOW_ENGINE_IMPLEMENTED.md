# Flow-based auto-reply architecture

## Pipeline

```
User Message
  → Meta WhatsApp Cloud API
  → Webhook (app/api/webhooks/whatsapp/route.ts)
  → Message Validator (modules/webhook/)
  → Message Store (modules/messages/)
  → Message Router (modules/router/)
  → Session Manager (modules/sessions/)
  → Auto Reply Engine (services/auto-reply-engine/)
  → Flow / Rule Engine (services/auto-reply-engine/flow-runner.ts)
  → Response Generator (services/response-generator.ts)
  → WhatsApp Send (modules/whatsapp/whatsapp-sender.ts)
  → User
```

Webhook route responsibilities: verify subscription, validate signature & JSON, parse payload, log raw event, run `processInboundWebhook()`.

## Key modules

| Path | Role |
|------|------|
| `modules/webhook/` | Verify, validate, parse |
| `modules/messages/message-store.ts` | Persist inbound/outbound |
| `modules/router/message-router.ts` | Active session / triggers / welcome |
| `modules/sessions/session-manager.ts` | Flow session CRUD |
| `services/auto-reply-engine/` | Orchestrates flow → AI → fallback |
| `services/flow-engine/flow-executor.ts` | Step execution |
| `services/flow-engine/flow-seed.service.ts` | Default + automation rule flows |
| `services/inbound-message-processor.ts` | End-to-end inbound processing |

## Rules (no hardcoded if/else chains)

Portal **Automations** (away, welcome, keywords) sync into Supabase `flows` rows (`rule_away`, `rule_welcome`, `rule_keyword_*`) on each message. Menu flows use the flow builder / default welcome flow.

Optional **AI** runs only when no flow matches and AI is enabled for the conversation.

## Database

Run `supabase/flow-engine-migration.sql` if `flows` / `flow_sessions` tables are missing.

## UI

- `/flows` — list flows
- `/api/flows` — CRUD API
