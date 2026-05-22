# Integration guide — FlowChat AI

Production URL: **https://wa-bot-portal.vercel.app**

Use the in-app **Integrations** page (`/integrations`) for a live checklist.

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

Add in **Settings → Environment Variables**, then **Redeploy**:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://wa-bot-portal.vercel.app
WHATSAPP_VERIFY_TOKEN=my-wa-bot-2026
WHATSAPP_PHONE_ID=
WHATSAPP_TOKEN=
OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=minimax/minimax-m2.5:free
```

---

## 3. App login

1. Open https://wa-bot-portal.vercel.app
2. Sign up / sign in
3. Go to **Integrations** — follow the 5-step checklist

---

## 4. WhatsApp (Meta)

1. [developers.facebook.com](https://developers.facebook.com) → your app → **WhatsApp**
2. **API Setup** → copy **Phone number ID** and **Access token**
3. **Vercel env:** `WHATSAPP_PHONE_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`
4. **Configuration → Webhook**
   - Callback URL: `https://wa-bot-portal.vercel.app/api/webhooks/whatsapp`
   - Verify token: same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to **messages**

---

## 5. OpenRouter (AI)

1. [openrouter.ai](https://openrouter.ai) → API key
2. **Settings → AI** in app → paste key → save
3. **AI Bot** → turn **AI Assistant ON** → add prompt → save

---

## 6. Test auto-reply

Message your WhatsApp business number from your phone. You should get an AI reply within seconds. Check **Inbox**.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Meta webhook fails | `WHATSAPP_VERIFY_TOKEN` on Vercel + redeploy; match token in Meta |
| No AI reply | OpenRouter key, AI Bot enabled, text message (not only image) |
| 500 on APIs | Supabase env vars + redeploy |
| Message in inbox, no WhatsApp reply | Phone ID + access token in Settings |
