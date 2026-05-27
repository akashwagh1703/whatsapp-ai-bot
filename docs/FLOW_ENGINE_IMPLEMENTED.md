# Flow engine — implementation status

Implements the architecture from `WHATSAPP_BOT_ARCHITECTURE_REFACTOR.md` (Phase 1–3 core).

## Message lifecycle (new)

```
WhatsApp inbound
  → POST /api/webhooks/whatsapp
  → parse & validate payload
  → save message (Supabase)
  → Message pipeline
       → Away mode? (legacy automations)
       → Message router
            → Active flow session? → continue flow
            → Trigger match? → start flow
            → Else legacy (keywords, welcome, AI, thanks fallback)
       → Flow executor (dynamic steps)
  → WhatsApp send + save outbound
```

## New database tables

Run in Supabase SQL Editor:

`supabase/flow-engine-migration.sql`

- `flows` — triggers + JSON `definition.steps`
- `flow_sessions` — current step, context, status

## New code layout

| Path | Role |
|------|------|
| `modules/router/message-router.ts` | Routes only — no business text |
| `modules/sessions/session-service.ts` | Session CRUD + TTL |
| `modules/flows/flow-repository.ts` | Load/save flows, trigger match |
| `modules/flows/default-flows.ts` | Welcome flow template |
| `services/flow-engine/flow-executor.ts` | Step types: message, buttons, list, input, condition, api, end |
| `services/flow-engine/message-pipeline.ts` | Orchestrates flow vs legacy |
| `services/flow-engine/flow-seed.service.ts` | Seeds default welcome flow |

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Service health |
| `GET /api/flows` | List flows (login) |
| `POST /api/flows` | Create/update flow JSON |

## UI

- **Dashboard → Flows** (`/flows`) — view flows and step JSON

## Backward compatibility

- `FLOW_ENGINE_ENABLED=false` → legacy-only (keywords, AI, thanks)
- Away message still overrides (unchanged)
- Existing webhook, inbox, AI bot unchanged when no flow matches
- Default **welcome** flow seeds on first message if table empty

## Env

```env
FLOW_ENGINE_ENABLED=true
FLOW_SESSION_TTL_HOURS=24
```

## Test

1. Run migration SQL  
2. Send WhatsApp: `hi`  
3. Expect welcome flow (menu buttons), not only AI/thanks  
4. `/flows` page shows `welcome` flow definition  

## Not yet implemented (future-ready only)

- Redis queue / delayed jobs
- Visual flow builder UI
- Campaign system
- Full `api` step worker

Architecture is modular so these can plug into `flow-executor` and `message-router` later.
