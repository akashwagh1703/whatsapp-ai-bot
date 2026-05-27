# WHATSAPP BOT ARCHITECTURE REFACTOR

You are a senior software architect, Next.js backend engineer, and scalable systems expert.

Your task is to COMPLETELY ANALYZE, AUDIT, REFACTOR, RESTRUCTURE, and UPGRADE the entire existing WhatsApp bot project into a CLEAN, SCALABLE, PRODUCTION-READY FLOW-BASED ARCHITECTURE.

IMPORTANT:
This is NOT a new project build.

This is a SAFE ARCHITECTURE REFACTOR of an already working production bot.

The existing system already contains:
- Meta WhatsApp Cloud API integration
- webhook handling
- incoming message processing
- outgoing message sending
- Supabase integration
- Next.js project structure
- business logic
- workflows
- utility functions
- services
- existing database schema

Your FIRST responsibility is to DEEPLY UNDERSTAND the existing project before changing anything.

DO NOT randomly rewrite the project.

DO NOT break working functionality.

DO NOT create disconnected architecture.

The goal is:
- preserve working functionality
- remove bad architecture
- remove technical debt
- remove duplicated logic
- modularize the system
- improve scalability
- improve maintainability
- transform the bot into a FLOW-BASED ENGINE

---

# PRIMARY OBJECTIVE

Convert the current hardcoded WhatsApp bot into a:

PRODUCTION-READY FLOW-BASED WHATSAPP BOT ENGINE

Architecture must become:

Incoming WhatsApp Message
    ↓
Webhook API Route
    ↓
Message Validation
    ↓
Message Storage
    ↓
Message Router
    ↓
Session Detection
    ↓
Flow Detection
    ↓
Flow Executor
    ↓
Response Generator
    ↓
WhatsApp Sender
    ↓
Conversation Storage

---

# IMPORTANT RULES

VERY IMPORTANT:

- DO NOT break existing working features unnecessarily
- DO NOT delete functionality before replacing it safely
- DO NOT perform unsafe refactors
- DO NOT hardcode business logic
- DO NOT hardcode message replies
- DO NOT introduce overengineering
- DO NOT generate fake architecture without understanding the project
- DO NOT duplicate services
- DO NOT create tightly coupled modules

ALWAYS:
- preserve working business flows
- migrate carefully
- refactor safely
- improve architecture incrementally
- keep the system stable
- maintain backward compatibility where required

---

# CURRENT TECH STACK

Framework:
- Next.js App Router

Backend:
- Next.js API Routes

Database:
- Supabase PostgreSQL

Authentication:
- Supabase Auth

WhatsApp Provider:
- Meta WhatsApp Cloud API

Language:
- TypeScript

---

# PHASE 1 — COMPLETE PROJECT ANALYSIS

FIRST deeply analyze the ENTIRE existing project.

Audit and understand:

## Architecture
- current folder structure
- application architecture
- dependency flow
- module organization
- service organization

## Backend
- API routes
- webhook implementation
- WhatsApp integration
- message lifecycle
- routing logic
- business logic
- response generation
- utility usage
- helper functions
- middleware
- validation logic
- async handling
- error handling

## Database
- Supabase schema
- tables
- relationships
- indexes
- foreign keys
- constraints
- RLS policies
- query patterns
- scalability issues
- normalization issues
- duplication issues

## Frontend
- dashboard structure
- API consumption
- state management
- unnecessary UI complexity

## Code Quality
- duplicated logic
- dead code
- tightly coupled modules
- bad abstractions
- scalability bottlenecks
- performance issues
- naming issues
- architecture inconsistencies
- technical debt

---

# REQUIRED FIRST OUTPUT

Before making ANY changes:

Generate a COMPLETE PROJECT AUDIT REPORT.

The audit report MUST include:

1. Current architecture overview
2. Current message lifecycle
3. Current webhook flow
4. Current routing system
5. Current session handling
6. Current database structure
7. Existing reusable systems
8. Problems in current architecture
9. Problems in database design
10. Problems in scalability
11. Problems in code organization
12. Duplicate logic found
13. Technical debt analysis
14. Performance bottlenecks
15. Security concerns
16. Missing abstractions
17. Recommended improvements
18. Safe migration strategy

DO NOT SKIP THIS STEP.

---

# REQUIRED SECOND OUTPUT

After the audit:

Generate a COMPLETE STEP-BY-STEP REFACTOR STRATEGY.

The strategy MUST include:

## Refactor Roadmap
- exact implementation order
- safe migration sequence
- dependency-safe upgrades
- rollback-safe approach

## Database Migration Plan
- schema improvements
- relationship fixes
- indexing improvements
- normalization improvements
- migration scripts
- backward compatibility strategy

## Architecture Migration Plan
- folder restructuring
- service extraction
- modularization
- router redesign
- session redesign
- flow engine integration

## Cleanup Strategy
- dead code removal
- duplicate removal
- utility consolidation
- service consolidation

## Testing Strategy
- regression testing
- webhook testing
- flow testing
- session testing
- database validation

DO NOT START IMPLEMENTATION BEFORE THIS STRATEGY IS COMPLETE.

---

# TARGET ARCHITECTURE

The final architecture MUST become:

```text
src/
 ├── app/
 │    ├── api/
 │    │     ├── webhook/
 │    │     ├── messages/
 │    │     └── health/
 │    │
 │    └── dashboard/
 │
 ├── modules/
 │    ├── webhook/
 │    ├── router/
 │    ├── sessions/
 │    ├── flows/
 │    ├── messages/
 │    ├── users/
 │    └── whatsapp/
 │
 ├── services/
 │    ├── flow-engine/
 │    ├── flow-executor/
 │    ├── session-service/
 │    ├── message-router/
 │    ├── whatsapp-service/
 │    ├── database-service/
 │    └── validation-service/
 │
 ├── lib/
 │    ├── supabase/
 │    ├── validations/
 │    ├── constants/
 │    ├── helpers/
 │    ├── utils/
 │    └── errors/
 │
 ├── middleware/
 ├── config/
 ├── types/
 └── queue/

 MOST IMPORTANT REQUIREMENT

The system MUST become FLOW-BASED.

Remove hardcoded reply architecture.

BAD:

if(message === "hi"){
   sendReply("Welcome")
}

GOOD:

{
  "trigger": "hi",
  "flow": "welcome_flow"
}

The bot MUST dynamically:

load flows
execute steps
continue sessions
process workflows

NO HARDCODING.

REQUIRED FLOW ENGINE

Create centralized scalable FLOW ENGINE.

The flow engine MUST support:

message steps
button steps
list steps
input collection
conditional branching
API call steps
dynamic step navigation
session persistence
fallback handling
retry handling
end states
REQUIRED FLOW FORMAT

Flows must be:

database-driven
OR
JSON-driven

Example:

{
  "id": "welcome_flow",
  "trigger": "hi",
  "steps": [
    {
      "id": "step_1",
      "type": "message",
      "text": "Welcome to our service"
    },
    {
      "id": "step_2",
      "type": "buttons",
      "buttons": [
        "Support",
        "Pricing",
        "Order"
      ]
    }
  ]
}
REQUIRED SESSION MANAGEMENT

Create persistent scalable session system.

Track:

current flow
current step
collected data
session status
last interaction
flow progress

Sessions MUST persist in Supabase.

REQUIRED MESSAGE ROUTER

The router MUST:

detect active sessions
continue active flow
detect triggers
start flows
handle unknown inputs
handle fallbacks

Router MUST NOT contain business logic.

Router ONLY routes messages.

REQUIRED FLOW EXECUTOR

Create centralized execution engine.

Example:

executeStep(step, userMessage)

Supported step types:

message
buttons
list
input
condition
api
end

Execution MUST be dynamic.

REQUIRED DATABASE IMPROVEMENTS

Deeply analyze current Supabase schema.

If required:

redesign schema safely
improve relationships
improve indexes
improve scalability
improve normalization
improve constraints
improve naming conventions

Required entities:

users
conversations
sessions
flows
flow_steps
messages

Create migration-safe changes only.

REQUIRED CLEAN CODE RULES

VERY IMPORTANT:

remove duplicate logic
remove deeply nested conditions
remove direct WhatsApp reply logic
remove temporary hacks
remove dead code
remove tightly coupled modules
use reusable services
use centralized validation
use centralized error handling
use proper TypeScript typing
use proper async/await
use clean architecture principles
use environment configs correctly
REQUIRED SCALABILITY PREPARATION

Prepare architecture for future:

Redis queues
retries
delayed jobs
AI integration
multi-tenant support
campaign system

DO NOT fully implement them now.

ONLY make architecture ready.

IMPLEMENTATION RULES

VERY IMPORTANT:

Refactor PHASE-BY-PHASE.

After every major phase:

validate functionality
verify webhook works
verify messages work
verify sessions work
verify flows work
verify database integrity
verify no regression

DO NOT leave broken code.

DO NOT leave partial implementations.

FINAL GOAL

The final result MUST be:

scalable
modular
maintainable
production-ready
workflow-driven
cleanly structured
queue-ready
AI-ready
enterprise-ready

while preserving current working functionality safely.

FOCUS ONLY ON:
BUILDING A CLEAN PRODUCTION-READY WHATSAPP BOT ENGINE ARCHITECTURE.