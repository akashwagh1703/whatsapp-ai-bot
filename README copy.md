# FlowChat AI — WhatsApp Assistant Platform

Production-ready AI WhatsApp assistant for businesses. Premium SaaS UI with inbox, AI bot, automations, analytics, and Meta WhatsApp Cloud API integration.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + custom shadcn-style components
- **Supabase** (Auth, PostgreSQL, Realtime)
- **OpenRouter** (DeepSeek, Gemini, GPT)
- **Meta WhatsApp Cloud API**
- **Zustand** + **TanStack Query** + **Recharts** + **Framer Motion**

## Quick start

### 1. Clone and install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Enable Email auth in Authentication → Providers
4. Copy URL and keys into `.env.local`

### 3. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=minimax/minimax-m2.5:free
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=flowchat-verify
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. WhatsApp (Meta)

1. Create an app in [Meta for Developers](https://developers.facebook.com)
2. Add WhatsApp product and get Phone ID + Access Token
3. Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
4. Verify token: same as `WHATSAPP_VERIFY_TOKEN`
5. Subscribe to `messages`

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign up → configure Settings → WhatsApp & AI.

## Deploy (Vercel)

1. Import repo to Vercel
2. Add all env vars from `.env.example`
3. Set `NEXT_PUBLIC_APP_URL` to your production URL
4. Point Meta webhook to `https://your-app.vercel.app/api/webhooks/whatsapp`

## Modules

| Module | Route |
|--------|-------|
| Dashboard | `/dashboard` |
| Inbox | `/inbox` |
| AI Bot | `/ai-bot` |
| Automations | `/automations` |
| Contacts | `/contacts` |
| Analytics | `/analytics` |
| Integrations | `/integrations` |
| Settings | `/settings` |

## Architecture

```
Incoming WhatsApp message
  → POST /api/webhooks/whatsapp
  → Save message (Supabase)
  → Keyword / welcome automations
  → AI reply (OpenRouter) if enabled
  → Send WhatsApp response
  → Realtime update → Inbox UI
```

## Project structure

```
app/           # Routes (auth, dashboard, API)
components/    # UI + layout + inbox + analytics
lib/           # Supabase, utils, business helpers
services/      # AI, WhatsApp, messages, analytics
store/         # Zustand UI state
types/         # TypeScript types
constants/     # Nav, models, tones
hooks/         # React Query hooks
supabase/      # SQL schema
```

## Security

- Supabase RLS on all tables
- Protected dashboard routes (middleware)
- Webhook verify token (GET challenge)
- Rate limiting on API routes
- Service role only in webhook handler

## License

Private / your use.
