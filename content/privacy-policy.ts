import { APP_NAME } from "@/constants";

export const PRIVACY_LAST_UPDATED = "May 25, 2026";

export const PRIVACY_SECTIONS: { id: string; title: string; paragraphs: string[] }[] =
  [
    {
      id: "introduction",
      title: "1. Introduction",
      paragraphs: [
        `This Privacy Policy explains how ${APP_NAME} ("we", "us", "our") collects, uses, stores, and shares information when you use our WhatsApp AI assistant platform (the "Service"), including the web dashboard, APIs, and WhatsApp messaging features.`,
        "The Service is designed for businesses to manage WhatsApp customer conversations, automate replies with AI, and configure branding and automations. By creating an account, signing in, or using the Service, you agree to this Privacy Policy.",
      ],
    },
    {
      id: "controller",
      title: "2. Who is responsible for your data",
      paragraphs: [
        "The data controller is the business entity that operates your deployment of the Service (for example, the organization that signed up and configured the WhatsApp number).",
        "If you are an end customer messaging a business on WhatsApp, your messages are processed on behalf of that business; contact them directly for questions about how they use your data.",
      ],
    },
    {
      id: "what-we-collect",
      title: "3. Information we collect",
      paragraphs: [
        "Account information: email address and authentication credentials managed through Supabase Auth when you register or sign in.",
        "Business profile: business name, optional logo URL, brand colors, contact email and phone, and workspace settings you enter in the dashboard.",
        "WhatsApp messaging data: customer phone numbers, display names, message content (text and metadata such as message type), WhatsApp message IDs, conversation status, and timestamps when messages are sent or received through the Meta WhatsApp Cloud API webhook.",
        "AI configuration: AI prompts, tone, business knowledge text, reply language preference, automation rules (welcome messages, away messages, keyword replies), and related settings stored in our database.",
        "Technical and operational data: webhook event logs (fields received, message counts, warnings), daily analytics aggregates (conversations, AI replies, human replies, leads), and optional outbound webhook payloads if you connect a CRM URL.",
        "Files you upload: business logos uploaded to Supabase Storage (when configured).",
        "We do not intentionally collect payment card data within the Service; billing for third-party services (hosting, AI, WhatsApp) is handled by those providers under their own terms.",
      ],
    },
    {
      id: "how-we-use",
      title: "4. How we use information",
      paragraphs: [
        "To provide the Service: authenticate users, display the inbox, store conversations, send and receive WhatsApp messages, and generate AI replies when enabled.",
        "To improve reliability: verify Meta webhooks, prevent duplicate processing, log errors, and show integration status in the admin dashboard.",
        "To personalize your workspace: apply your branding (name, logo, colors) across the dashboard and cached login experience.",
        "To notify you: in-app notifications for events such as human handoff requests.",
        "We do not sell your personal information. We do not use your WhatsApp message content to train public AI models; message text is sent to the AI provider you configure only to generate replies for your business.",
      ],
    },
    {
      id: "third-parties",
      title: "5. Third-party services we use",
      paragraphs: [
        "Supabase: hosting of the application database, authentication, row-level security for tenant data, optional file storage for logos, and realtime updates. Data is stored in your Supabase project region as configured by the operator.",
        "Meta (WhatsApp Business Platform): delivery and receipt of WhatsApp messages via the Cloud API, webhook notifications, and phone number verification. Meta's terms and privacy policy apply to use of WhatsApp.",
        "OpenRouter: when AI auto-reply is enabled, inbound message text (and limited conversation history) is sent to OpenRouter, which routes requests to the AI model you select (for example a free or paid model named in your environment configuration). OpenRouter and the underlying model provider process data according to their policies.",
        "Vercel (or similar host): application hosting, environment variables, and HTTPS delivery of the web app and API routes.",
        "Optional outbound webhooks: if you configure a webhook URL, event payloads (such as new message, new lead, or AI handoff) may be sent to your own server or CRM.",
      ],
    },
    {
      id: "ai-processing",
      title: "6. AI and automated processing",
      paragraphs: [
        "When the AI assistant is enabled, customer messages may be processed automatically to produce replies. You can disable AI globally, per conversation (human mode), or use away messages and keyword rules instead.",
        "AI replies depend on your prompt, business knowledge, tone, and language settings. You are responsible for reviewing AI behavior and complying with laws applicable to your industry (including not providing medical, legal, or financial advice unless qualified).",
        "Message content sent to OpenRouter is limited to what is needed for the reply (system instructions plus recent conversation history).",
      ],
    },
    {
      id: "retention",
      title: "7. Data retention",
      paragraphs: [
        "We retain account, conversation, and message data for as long as your business workspace exists or until you delete data through the Service or request deletion from your administrator.",
        "Webhook debug logs and analytics may be retained for operational troubleshooting; you may clear or archive data in your database according to your Supabase retention practices.",
        "Authentication session cookies expire according to Supabase Auth settings.",
      ],
    },
    {
      id: "security",
      title: "8. Security",
      paragraphs: [
        "We use HTTPS, authenticated API routes, Supabase row-level security, and optional Meta webhook signature verification (X-Hub-Signature-256) when WHATSAPP_APP_SECRET is configured.",
        "Secrets such as WhatsApp tokens, OpenRouter API keys, and Supabase service role keys must be stored in server environment variables, not in client-side code or public repositories.",
        "No method of transmission or storage is 100% secure; you should use strong passwords and restrict access to your Meta and Supabase accounts.",
      ],
    },
    {
      id: "cookies",
      title: "9. Cookies and local storage",
      paragraphs: [
        "We use essential cookies and similar technologies for Supabase authentication sessions so you can stay signed in.",
        "We may store branding preferences in your browser local storage so the login page can display your business name and colors after you have saved appearance settings.",
        "We do not use third-party advertising cookies within the Service.",
      ],
    },
    {
      id: "rights",
      title: "10. Your rights and choices",
      paragraphs: [
        "Account holders may access and update business settings, AI configuration, and automations in the dashboard.",
        "You may sign out at any time or request account deletion from your service operator; deletion should include Supabase auth user and related business rows.",
        "Depending on your location, you may have rights to access, correct, delete, or export personal data, or to object to certain processing. Contact your business operator or us using the details below.",
        "End customers who message you on WhatsApp should contact you (the business) to exercise privacy rights regarding those conversations.",
      ],
    },
    {
      id: "international",
      title: "11. International transfers",
      paragraphs: [
        "Your data may be processed in countries where Supabase, Meta, OpenRouter, Vercel, or your chosen infrastructure providers operate. Ensure appropriate safeguards (such as standard contractual clauses or provider certifications) if required by your jurisdiction.",
      ],
    },
    {
      id: "children",
      title: "12. Children",
      paragraphs: [
        "The Service is intended for business users and is not directed at children under 16. We do not knowingly collect personal data from children.",
      ],
    },
    {
      id: "changes",
      title: "13. Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. The \"Last updated\" date at the top will change when we do. Continued use of the Service after changes constitutes acceptance of the revised policy.",
      ],
    },
    {
      id: "contact",
      title: "14. Contact",
      paragraphs: [
        `For privacy questions about ${APP_NAME}, contact the operator of your deployment or the email address provided on your login or marketing site.`,
        "For Meta WhatsApp data practices, see https://www.whatsapp.com/legal/privacy-policy",
        "For OpenRouter, see https://openrouter.ai/privacy",
        "For Supabase, see https://supabase.com/privacy",
      ],
    },
  ];
