# AI WhatsApp Assistant Platform — Master Fullstack Development Prompt

## PROJECT OVERVIEW

Build a production-ready AI WhatsApp Assistant Platform for businesses.

This is NOT a technical CRM.
This is NOT a developer dashboard.

This platform should feel:

* premium
* modern
* AI-powered
* minimal
* elegant
* extremely user friendly
* non-technical friendly
* visually impressive
* calm and clean
* business-focused

The product should feel like:

* Linear
* Notion
* Intercom
* Stripe
* Vercel

combined with WhatsApp automation.

The system must allow businesses to:

* connect WhatsApp
* manage customer conversations
* enable AI replies
* manage automations
* monitor analytics
* capture leads
* use WhatsApp redirect widgets

The platform must be:

* fullstack
* scalable
* production-ready
* reusable as boilerplate
* optimized for low-cost deployment
* mobile responsive
* modern SaaS quality

---

# CORE TECH STACK

Use ONLY these technologies:

## Frontend + Backend

* Next.js 15 App Router
* TypeScript

## Styling

* Tailwind CSS
* shadcn/ui
* Framer Motion (minimal)
* Lucide React Icons

## Database

* Supabase PostgreSQL

## Authentication

* Supabase Auth

## State Management

* Zustand

## Data Fetching

* TanStack Query

## Charts

* Recharts

## AI Integration

* OpenRouter API

## WhatsApp Integration

* Meta WhatsApp Cloud API

## Deployment

* Vercel

---

# IMPORTANT DEVELOPMENT RULES

## UI/UX RULES

The design MUST:

* feel premium
* use clean spacing
* use soft shadows
* avoid clutter
* avoid gradients
* avoid colorful UI
* avoid technical complexity
* avoid crowded dashboards

The dashboard should feel:

* calm
* intelligent
* modern
* premium
* polished

Use:

* large spacing
* rounded corners
* elegant typography
* smooth transitions
* soft borders
* subtle animations

Avoid:

* flashy effects
* heavy animations
* overly bright colors
* dense UI
* technical terminology

---

# DESIGN SYSTEM

## Theme

Create a professional SaaS design system.

### Colors

Background:

* #F8FAFC

Sidebar:

* #0F172A

Primary:

* Emerald/Green

Text:

* Slate shades

Borders:

* subtle gray

---

## Typography

Use:

* Inter or Geist font

Headings:

* bold
* large
* modern

Body:

* highly readable

---

## Cards

Cards should:

* have soft shadows
* rounded corners
* spacious padding
* subtle hover effects

---

# APPLICATION STRUCTURE

Create complete fullstack architecture.

Use this structure:

```txt
app/
components/
lib/
services/
store/
types/
constants/
hooks/
styles/
```

---

# REQUIRED MODULES

Build ONLY these modules.

Do NOT add extra modules.

---

# MODULE 1 — AUTHENTICATION

## Features

* Login page
* Forgot password
* Session management
* Protected routes

## UI

The login page must feel premium.

### Left Side

* elegant branding
* modern AI illustration
* business automation feel

### Right Side

* minimal login form
* clean spacing
* soft card

---

# MODULE 2 — DASHBOARD

## Goal

Dashboard should feel intelligent.

Do NOT create technical dashboard.

Create a smart business overview.

---

## Dashboard Layout

### Hero Section

Large welcome card.

Example:

"Your AI assistant is actively helping customers today."

---

## Statistics Cards

Create beautiful analytics cards:

* Total Conversations
* AI Replies
* Human Replies
* Leads Generated
* Active Conversations
* Response Rate

Use:

* icons
* trends
* mini indicators

---

## Charts

Create elegant charts:

* messages graph
* leads graph
* AI activity graph

Use Recharts.

---

## Recent Conversations

Show:

* customer avatar
* last message
* AI badge
* timestamp

---

# MODULE 3 — INBOX

## Most Important Module

The inbox should feel:

* modern
* premium
* WhatsApp inspired
* clean
* fast

---

# Inbox Layout

## Left Sidebar

Conversation list.

Each item contains:

* avatar
* customer name
* last message
* unread count
* timestamp
* AI badge

---

## Center Chat Area

Create:

* WhatsApp-style message bubbles
* media support
* elegant timestamps
* AI reply badges
* typing indicators
* smooth scrolling

---

## Right Customer Panel

Show:

* customer details
* phone number
* last interaction
* total conversations
* notes

---

## Inbox Features

* realtime updates
* search conversations
* message sending
* media preview
* image support
* voice notes
* mobile responsive

---

# MODULE 4 — AI BOT SETTINGS

## Goal

This should feel magical and easy.

Do NOT expose technical AI settings heavily.

Use guided setup.

---

## Features

### AI Toggle

Enable/disable AI.

---

### AI Prompt

Large textarea.

---

### AI Tone

Options:

* Professional
* Friendly
* Sales Focused
* Luxury Brand

---

### AI Model

Dropdown:

* DeepSeek
* Gemini
* GPT

---

### Business Knowledge

Allow user to enter:

* business details
* services
* pricing
* FAQs

---

### Human Handoff

Toggle:

* transfer to human when needed

---

# MODULE 5 — AUTOMATIONS

Keep this module extremely simple.

---

## Features

### Welcome Message

### Away Message

### Keyword Auto Replies

Example:

| Keyword | Reply            |
| ------- | ---------------- |
| pricing | pricing response |
| support | support response |

---

## UI

Use:

* clean cards
* toggle switches
* simple forms

Avoid:

* workflow builders
* technical automation systems

---

# MODULE 6 — CONTACTS

## Features

* customer list
* phone numbers
* lead source
* last interaction
* export CSV

---

## UI

Modern table design.

Use:

* clean spacing
* rounded rows
* elegant filters

---

# MODULE 7 — ANALYTICS

## Goal

Create beautiful but simple analytics.

---

## Include

* daily conversations
* AI response percentage
* leads generated
* peak activity timing
* customer growth

---

## Design

Analytics must feel:

* simple
* visual
* non-technical
* premium

---

# MODULE 8 — INTEGRATIONS

## Features

### Webhook URL

### API Token

### Event Selection

* new lead
* new message
* AI handoff

---

# MODULE 9 — SETTINGS

## Tabs

* General
* WhatsApp
* AI
* API

---

## General Settings

* business name
* logo
* email
* phone

---

## WhatsApp Settings

* phone ID
* access token
* verify token

---

## OpenRouter Settings

* API key
* model selection

---

# WHATSAPP SYSTEM

## WhatsApp Integration

Use Meta WhatsApp Cloud API.

---

## Incoming Webhook Flow

```txt
User Message
→ WhatsApp Webhook
→ Save Message
→ AI Processing
→ Generate Reply
→ Send Response
→ Update Dashboard
```

---

# AI SYSTEM

## OpenRouter Integration

Use:

* DeepSeek
* Gemini
* GPT

Allow dynamic model switching.

---

## AI Prompt System

Create modular AI prompt system.

---

## AI Flow

```txt
Incoming Message
→ AI Enabled Check
→ Generate Prompt
→ OpenRouter Request
→ AI Response
→ Save Message
→ Send WhatsApp Reply
```

---

# HUMAN HANDOFF

If:

* user asks for human
* AI confidence low
* angry sentiment

Then:

* disable AI temporarily
* notify dashboard
* allow manual reply

---

# REALTIME SYSTEM

Use:

* Supabase Realtime

Realtime updates for:

* messages
* notifications
* inbox
* conversation updates

---

# DATABASE ARCHITECTURE

Create scalable Supabase schema.

Include:

* users
* contacts
* conversations
* messages
* ai_settings
* automations
* analytics
* settings
* webhooks

Use:

* proper indexes
* timestamps
* UUID primary keys

---

# API ARCHITECTURE

Create clean service architecture.

Use:

```txt
services/
```

Create:

* ai.service.ts
* whatsapp.service.ts
* analytics.service.ts
* message.service.ts

---

# PERFORMANCE RULES

Optimize:

* images
* rendering
* API calls
* loading states
* database queries

Use:

* pagination
* lazy loading
* suspense
* skeleton loaders

---

# MOBILE RESPONSIVENESS

The entire platform must be fully responsive.

Especially:

* inbox
* dashboard
* settings

Create:

* collapsible sidebar
* responsive cards
* mobile inbox layout

---

# SIDEBAR STRUCTURE

Use this exact sidebar:

```txt
Dashboard
Inbox
AI Bot
Automations
Contacts
Analytics
Integrations
Settings
```

---

# UX RULES

Every screen must answer:

* what is happening?
* what should user do next?

The experience must feel:

* guided
* calm
* intelligent
* polished

---

# EMPTY STATES

Create smart empty states.

Example:

"No conversations yet. Your AI assistant is ready to help customers."

---

# ANIMATION RULES

Use Framer Motion VERY lightly.

Only for:

* page transitions
* hover effects
* modal animations
* smooth loading

Avoid flashy animations.

---

# COMPONENT RULES

Create reusable components.

Examples:

* analytics cards
* conversation item
* message bubble
* settings card
* chart wrappers
* AI status badge

---

# CODE QUALITY RULES

Use:

* modular architecture
* reusable hooks
* reusable services
* clean TypeScript types
* proper folder structure
* scalable components

Avoid:

* duplicated logic
* huge components
* messy state management

---

# ENVIRONMENT VARIABLES

Create:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=
```

---

# SECURITY RULES

Implement:

* protected routes
* webhook verification
* API validation
* rate limiting
* environment security
* proper authentication

---

# DEPLOYMENT RULES

The application must be optimized for:

* Vercel deployment
* low-cost infrastructure
* reusable deployments
* production hosting

---

# FINAL PRODUCT EXPERIENCE

The final product must feel:

* premium
* polished
* AI-native
* modern
* simple
* powerful
* non-technical friendly
* visually impressive
* highly usable

The platform should make business owners feel:

"Everything is automated, simple, and under control."

---

# IMPORTANT FINAL RULES

* Build production-ready code.
* Use modern SaaS design patterns.
* Keep the UI clean and minimal.
* Focus heavily on UX.
* Build reusable architecture.
* Do not overcomplicate the platform.
* Prioritize simplicity and elegance.
* Make every screen feel premium.
* Make the inbox experience exceptional.
* Make AI settings feel magical and guided.
* Ensure entire platform feels cohesive.
* Create highly polished interfaces.
* Avoid generic admin dashboard appearance.
* Make this feel like a premium AI product.
