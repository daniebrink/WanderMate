# WanderMate — Technical Specification
## Part 01: Architecture Overview

> This document describes the high-level architecture, tech stack, and structural decisions for the WanderMate platform. It is written to be read by developers, designers, and future maintainers.

---

## 1. System Architecture

WanderMate is a **city-scoped experiences marketplace** with three frontend surfaces and one shared backend:

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Public Web  │  │  Admin Panel │  │  Mobile App      │  │
│  │  (Next.js)   │  │  (Next.js)   │  │  (React Native   │  │
│  │              │  │              │  │   — Phase 2)     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼────────────────────┼───────────┘
          │                 │                    │
          └─────────────────┴────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Local PG     │
                    │  (Backend)     │
                    │  ───────────   │
                    │  • PostgreSQL  │
                    │  • Custom Auth │
                    │  • iron-session│
                    │  • bcryptjs    │
                    └───────┬────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────▼─────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  Mapbox   │   │  Claude API │   │  WhatsApp   │
    │  (Maps)   │   │  (AI Layer) │   │  (WATI/     │
    │           │   │             │   │   Twilio)   │
    └───────────┘   └─────────────┘   └─────────────┘
```

**Key principle:** Every API call, query, and piece of UI is scoped to an **active city**. There is no global "all cities" view for tourists — only city admins and super admins see cross-city data.

---

## 2. Tech Stack & Justification

| Layer | Technology | Role | Why |
|---|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | Public site, dashboards, admin panels | SSR/SSG for SEO, single codebase for all surfaces, city-aware routing |
| **Styling** | Tailwind CSS + shadcn/ui | UI components, responsive design | Speed of development, accessibility out of the box |
| **Maps** | Mapbox GL JS | Activity maps, pickup points, radius explorer | 50k free loads/month, beautiful custom styling, clustering |
| **Backend** | Local PostgreSQL (`pg`) | Database, queries, transactions | Direct SQL via `node-postgres`; no external backend dependency; runs anywhere |
| **Auth** | Custom (`bcryptjs` + `iron-session`) | Tourist/guide/driver login | Password hashing + encrypted cookie sessions; no third-party auth lock-in |
| **AI** | Claude API (Anthropic) | Smart search, multilingual, itineraries | Best reasoning for natural language; handles structured output well |
| **WhatsApp** | Twilio or WATI | Booking alerts, confirmations | Twilio preferred for programmatic flexibility; WATI for speed |
| **Hosting** | Vercel | Next.js deployment | Zero-config deploys, preview branches, edge CDN |
| **Payments** | Stripe (Phase 2) | Booking payments, payouts | Stripe Connect for marketplace payouts; multi-currency support |

**Cost to launch:** ~R400–R800/month (mostly WhatsApp API). Everything else starts on free tiers.

---

## 3. Project Folder Structure

```
wandermate/
├── docs/                          # Documentation
│   ├── TECHNICAL_SPEC01.md        # Architecture Overview (this file)
│   ├── TECHNICAL_SPEC02.md        # Database Schema
│   ├── TECHNICAL_SPEC03.md        # Booking State Machine
│   ├── TECHNICAL_SPEC04.md        # API Specification
│   └── CAPE_TOWN_SEED.md          # Pilot city data
│
├── migrations/                    # Ordered SQL migrations
│   └── 001_local_postgres.sql     # Full schema for local PostgreSQL
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/              # Tourist-facing pages
│   │   │   ├── [city]/            # City-scoped routes
│   │   │   │   ├── page.tsx       # City homepage
│   │   │   │   ├── activities/
│   │   │   │   ├── guides/
│   │   │   │   ├── drivers/
│   │   │   │   └── packages/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/           # Guide & driver dashboards
│   │   │   ├── guide/
│   │   │   └── driver/
│   │   ├── (admin)/               # City admin panel
│   │   │   └── city/
│   │   └── api/                   # Route handlers (images, seed, etc.)
│   │
│   ├── components/                # Shared React components
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── auth/                  # Auth-related components
│   │   └── layout/                # Nav, footer, city-switcher
│   │
│   ├── lib/                       # Utilities & configs
│   │   ├── auth/                  # Custom auth (session.ts, password.ts)
│   │   ├── db.ts                  # PostgreSQL pool (node-postgres)
│   │   ├── db/                    # Server-side query helpers
│   │   ├── supabase/              # Legacy Supabase clients (deprecated)
│   │   ├── validation.ts          # Zod schemas
│   │   └── utils.ts
│   │
│   ├── types/                     # TypeScript types
│   │   └── index.ts
│   │
│   └── hooks/                     # Custom React hooks
│       └── use-city.ts            # Active city context
│
├── public/                        # Static assets
│   └── images/
│
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Why this structure?**
- **Route groups** (`(public)`, `(dashboard)`, `(admin)`) allow different layouts without polluting the URL.
- **`[city]` dynamic segment** enforces city-scoping at the routing layer. Every tourist page lives under a city slug.
- **Migrations are versioned SQL files** — run against any PostgreSQL instance (local, Docker, or managed).
- **Types are hand-written** in `src/types/index.ts` to match the schema and are kept in sync manually.

---

## 4. Multi-City Data Flow

Every request follows this pattern:

```
1. Tourist visits wandermate.com/cape-town
        │
        ▼
2. Middleware detects city slug from URL
   → Validates against `cities` table
   → Injects city context into request
        │
        ▼
3. All database queries include `WHERE city_id = '...'`
   → Enforced by application logic
   → Reinforced by RLS policies
        │
        ▼
4. UI renders city-specific content:
   • Hero imagery from `cities.hero_images`
   • Categories from `categories` (filtered by city)
   • Activities/guides/drivers scoped to city
   • Currency symbol from `cities.currency_symbol`
   • Map center from `cities.map_center_*`
```

**City Switching:**
- Tourist changes city via dropdown → URL updates to `/johannesburg`
- Client-side cache is invalidated
- All queries re-fetch with new `city_id`
- Booking history (cross-city) is still visible in account page

---

## 5. Authentication & Authorization Strategy

### 5.1 User Types (Role-Based)

WanderMate has **5 user types**, stored in `profiles.user_type`:

| Type | Can Access | Data Scope |
|---|---|---|
| `tourist` | Public site, own bookings, own reviews | Own data only |
| `guide` | Public profile + dashboard | Own profile, own leads, own bookings |
| `driver` | Public profile + dashboard | Own profile, own leads, own bookings |
| `city_admin` | City admin panel | Single city: all guides, drivers, bookings, listings |
| `super_admin` | Super admin panel | All cities: everything |

### 5.2 Auth Flow

1. User signs up via registration form → password hashed with `bcryptjs`
2. Insert row into `users` table (email + password_hash), then `profiles` table with default `user_type = 'tourist'`
3. Guide/driver signs up via separate onboarding form → `user_type` updated after verification
4. On login, `iron-session` creates an encrypted cookie session containing `user_id` and `user_type`
5. Server actions and API routes read the session cookie to identify the current user

### 5.3 Security Layers

| Layer | Mechanism |
|---|---|
| **Authentication** | `iron-session` encrypted cookies |
| **Authorization** | Application-level checks in Server Actions / API routes |
| **Data isolation** | `city_id` filtering in SQL queries + user-type checks in code |
| **Input validation** | Zod schemas on all forms and API routes |
| **File access** | API routes serve images stored as BYTEA in PostgreSQL |

---

## 6. Key Architectural Decisions

### Decision 1: City Slug in URL Path
**Choice:** `/cape-town/activities` instead of `/?city=cape-town`
**Rationale:**
- SEO: Google indexes each city as a distinct site
- Shareability: URLs are self-describing
- Simplicity: No global state needed to track active city

### Decision 2: Application-Level Auth Over RLS
**Choice:** Use application-level authorization in Server Actions instead of PostgreSQL RLS
**Rationale:**
- Local PostgreSQL does not have the Supabase Auth context required for RLS
- Authorization logic lives in TypeScript next to business rules — easier to test and debug
- Database CHECK constraints and FKs still enforce data integrity at the SQL layer

### Decision 3: No Custom Backend for MVP
**Choice:** Server Actions + API routes handle all reads and writes directly against local PostgreSQL
**Rationale:**
- Fastest development path
- No network hop to an external backend service
- Can add a dedicated API layer later without changing the schema

### Decision 4: AI as a Service, Not a Core Dependency
**Choice:** Claude API for smart features, but platform works 100% without it
**Rationale:**
- If AI is down, search still works via standard SQL
- Prevents vendor lock-in — can swap to OpenAI or local model
- Keeps costs predictable (AI is pay-per-use, not subscription)

---

## 7. Scalability Considerations (Future-Proofing)

| Concern | Current (MVP) | Future |
|---|---|---|
| **Database** | Local PostgreSQL | Managed PostgreSQL (e.g. Neon, AWS RDS) |
| **Images** | PostgreSQL BYTEA / local API routes | Cloudflare R2 or AWS S3 with CDN |
| **Search** | SQL `ILIKE` + filters | Algolia or PostgreSQL full-text search |
| **AI** | Claude API direct calls | Cached responses + rate limiting |
| **WhatsApp** | Twilio/WATI single number | Per-city WhatsApp Business accounts |
| **Caching** | Next.js ISR + iron-session | Redis for session and query caching |

---

## 8. Development Environment Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Git

### Quick Start
```bash
# 1. Clone and install
git clone <repo>
cd wandermate
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with DATABASE_URL and SESSION_SECRET

# 3. Start local PostgreSQL (e.g. via Docker)
# docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# 4. Run migrations
psql $DATABASE_URL -f migrations/001_local_postgres.sql

# 5. Start dev server
npm run dev
```

---

*Next: Part 02 covers the complete database schema — tables, relationships, indexes, and RLS policies.*
