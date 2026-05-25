# Integration guide — FlowChat AI

Production URL: **https://wa-bot-portal.vercel.app**

Use the in-app **Integrations** page (`/integrations`) for a live checklist.

---

## Alignment checklist (Vercel + Meta + `.env.local`)

Use this table so local dev, production, and Meta Console stay in sync.

| Item | `.env.local` (local dev) | Vercel **Production** | Meta Developer Console |
|------|--------------------------|------------------------|-------------------------|
| Public app URL | `NEXT_PUBLIC_APP_URL` — use ngrok URL if testing webhooks locally; never leave as localhost for Meta | `https://wa-bot-portal.vercel.app` (your real domain) | Webhook callback must match Production URL |
| Webhook callback | `{NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp` | `https://wa-bot-portal.vercel.app/api/webhooks/whatsapp` | WhatsApp → Configuration → Webhook → Callback URL |
| Verify token | `WHATSAPP_VERIFY_TOKEN` (e.g. `flowchat-verify`) | **Same string** as local | Webhook → Verify token (must match exactly) |
| App secret | `WHATSAPP_APP_SECRET` from Meta → App settings → Basic | **Same** App Secret | Used automatically by Meta on every webhook POST |
| Phone number ID | `WHATSAPP_PHONE_ID` from API Setup | **Same** ID | Must match the number customers message |
| Access token | `WHATSAPP_TOKEN` from API Setup | **Same** token (rotate if leaked) | — |
| Webhook field | — | — | Subscribe to **`messages`** |
| Supabase | URL + anon + **service_role** keys | **Same** project keys on Production | — |
| OpenRouter | `OPENROUTER_API_KEY` | **Same** on Production | — |
| After any env change | Restart `npm run dev` | **Redeploy** Production (env does not apply until redeploy) | Re-save webhook if URL/token changed |

### Order of operations (first-time setup)

1. Run `supabase/schema.sql` and configure Supabase auth URLs for your production domain.
2. Add all env vars on **Vercel Production** → Redeploy.
3. Sign up on the **live** site (`https://wa-bot-portal.vercel.app/login`) so a `businesses` row exists.
4. In Meta: set callback URL + verify token → **Verify and save** → subscribe to **messages**.
5. Copy **App Secret** into Vercel `WHATSAPP_APP_SECRET` → Redeploy (webhook signature verification enabled).
6. Enable **AI Bot** in the app; send a test WhatsApp message; confirm **Inbox** + **Webhook test** live status.

### Local development notes

- Meta cannot call `http://localhost:3000`. Use a tunnel (ngrok, Cloudflare Tunnel) and set `NEXT_PUBLIC_APP_URL` to the tunnel HTTPS URL, or test against Production only.
- `.env.local` is **not** deployed to Vercel — duplicate every production secret in Vercel manually.
- **Webhook test → internal simulate** does not need a signature; **live HTTP** and real Meta POSTs require `WHATSAPP_APP_SECRET` when set on the server.

### Signature verification

When `WHATSAPP_APP_SECRET` is set, `POST /api/webhooks/whatsapp` requires header `X-Hub-Signature-256` (Meta sends this automatically). Unsigned requests return **401**. If the secret is unset, verification is skipped with a server warning (not recommended for production).

### Why “Webhook test” works but real WhatsApp does not

| | Internal simulate (`/api/setup/webhook-test`) | Real customer message (Meta → `/api/webhooks/whatsapp`) |
|--|--|--|
| Who calls | Your logged-in dashboard | Meta servers |
| Signature | **Skipped** | **Required** when `WHATSAPP_APP_SECRET` is set |
| `phone_number_id` in payload | Copied from your env (always matches) | From Meta (must match the number customers message) |
| Which server | The server you are browsing (local or Vercel) | **Only** the URL in Meta webhook settings (usually Production) |

**Most common root causes:** (1) `WHATSAPP_APP_SECRET` wrong on Vercel → 401, see `signature_rejected` in Webhook test → Recent calls; (2) internal test on localhost while Meta points to production with different/missing env; (3) `WHATSAPP_PHONE_ID` is WABA ID instead of Phone number ID; (4) Meta webhook not subscribed to **messages**; (5) App in Development mode — sender not on Meta test recipient list.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. **SQL Editor** → run `supabase/schema.sql`
3. **Authentication → URL configuration**
   - Site URL: `https://wa-bot-portal.vercel.app`
   - Redirect URLs: `https://wa-bot-portal.vercel.app/**`
4. Copy **Project URL**, **anon key**, **service_role key**

---

## 2. Vercel (env vars)

Add in **Settings → Environment Variables** (Production), then **Redeploy**:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://wa-bot-portal.vercel.app
WHATSAPP_VERIFY_TOKEN=my-wa-bot-2026
WHATSAPP_APP_SECRET=
WHATSAPP_PHONE_ID=
WHATSAPP_TOKEN=
OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=minimax/minimax-m2.5:free
```

`WHATSAPP_APP_SECRET` = Meta app → **App settings → Basic → App secret**.

---

## 3. App login

1. Open https://wa-bot-portal.vercel.app
2. Sign up / sign in
3. Go to **Integrations** — follow the setup steps

---

## 4. WhatsApp (Meta)

1. [developers.facebook.com](https://developers.facebook.com) → your app → **WhatsApp**
2. **API Setup** → copy **Phone number ID** and **Access token**
3. **App settings → Basic** → copy **App secret** → Vercel `WHATSAPP_APP_SECRET`
4. **Vercel env:** `WHATSAPP_PHONE_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
5. **Configuration → Webhook**
   - Callback URL: `https://wa-bot-portal.vercel.app/api/webhooks/whatsapp`
   - Verify token: same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to **messages**

---

## 5. OpenRouter (AI)

1. [openrouter.ai](https://openrouter.ai) → API key
2. **AI Bot** → turn **AI Assistant ON** → add prompt → save

---

## 6. Test auto-reply

1. Message your WhatsApp business number from your phone.
2. Check **Inbox** and **Webhook test** (live status / recent webhook calls).
3. Analytics **conversations** counts **new threads only** (first message from a contact), not every message.

---

## Platform enhancements (built-in)

| Feature | Behavior |
|---------|----------|
| **Away message** | Automations → Away ON sends `away_message` instead of AI (after keywords) |
| **Leads** | First message from a new phone increments **Leads** analytics + `new_lead` webhook event |
| **Notifications** | Bell icon → handoff alerts; realtime updates |
| **Media** | Images/audio get Meta download URL in Inbox (URLs expire — Meta limitation) |
| **Idempotency** | Duplicate `wa_message_id` ignored (run `supabase/enhancements-migration.sql` for DB index) |
| **Inbox send** | Fails loudly if WhatsApp API fails — message not saved to thread |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Meta webhook verify fails | `WHATSAPP_VERIFY_TOKEN` on Vercel + redeploy; match token in Meta |
| Webhook 401 / inbox empty | Set `WHATSAPP_APP_SECRET` on Vercel (same as Meta App Secret) + redeploy |
| No AI reply | OpenRouter key, AI Bot enabled, text message (not only image) |
| 500 on APIs | Supabase env vars + redeploy |
| Message in inbox, no WhatsApp reply | Phone ID + access token in env |
| `lastWebhookAt` empty | Wrong callback URL or app not published / number not allowed |
