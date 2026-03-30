# Technical Architecture

## Overview

Allergy Madness is a mobile-first web application built on Next.js 15 deployed to Render. The tournament engine runs server-side via Next.js API routes, with Supabase providing HIPAA-eligible data persistence and auth. The system integrates 7 external APIs (Google Pollen, Maps, Vision AI, OpenWeatherMap, WAQI, BatchData, Census) to build a real-time allergen prediction model using Elo scoring, Monte Carlo simulation, and pairwise tournament sorting.

The architecture follows a monolithic Next.js pattern — all API routes, the tournament engine, and the React UI live in a single deployable unit on Render. This is appropriate for the workshop build and early launch; the tournament engine can be extracted to a Cloud Run service later if compute isolation is needed.

## Technology Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui (initialize during scaffolding)
- **Testing**: Vitest + React Testing Library + jsdom

### Backend

- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes (App Router `route.ts` handlers)
- **Language**: TypeScript
- **Tournament Engine**: Server-side TypeScript module (`lib/engine/`)
- **Testing**: Vitest

### Database

- **Primary**: Supabase (PostgreSQL) — HIPAA-eligible with BAA
- **Auth**: Supabase Auth (email/password, OAuth optional)
- **Row-Level Security**: Enabled on all tables (schema pre-built)
- **Realtime**: Supabase Realtime for leaderboard live updates (optional)
- **Schema**: `AllergyMadness_schema_v1.sql` (pre-built, deploy to Supabase SQL Editor)

### Infrastructure

- **Hosting**: Render (web service, free tier for workshop)
- **PR Previews**: Render preview environments (enabled in render.yaml)
- **CI/CD**: GitHub Actions (lint + typecheck + test on PR)
- **Error Tracking**: Sentry (self-receiver in zero-config mode; external DSN optional)
- **Monitoring**: Render dashboard + Supabase dashboard

## System Design

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Render (Next.js)                      │
│                                                         │
│  ┌──────────────┐  ┌────────────────────────────────┐   │
│  │   React UI   │  │        API Routes              │   │
│  │              │  │                                │   │
│  │  Onboarding  │  │  POST /api/tournament/run      │   │
│  │  Leaderboard │  │  POST /api/checkin             │   │
│  │  Check-in    │  │  POST /api/onboarding          │   │
│  │  Travel Mode │  │  POST /api/trigger-scout/scan  │   │
│  │  Trigger     │  │  GET  /api/leaderboard         │   │
│  │    Scout     │  │  GET  /api/allergens           │   │
│  │  PDF Export  │  │  POST /api/referral            │   │
│  │  Settings    │  │  GET  /api/health              │   │
│  └──────┬───────┘  └──────────┬─────────────────────┘   │
│         │                     │                         │
│         └─────────┬───────────┘                         │
│                   │                                     │
│         ┌─────────▼─────────┐                           │
│         │  Tournament Engine │                          │
│         │  (lib/engine/)    │                           │
│         │                   │                           │
│         │  Elo Scoring      │                           │
│         │  Seasonal Gate    │                           │
│         │  Symptom Boost    │                           │
│         │  Monte Carlo Sim  │                           │
│         │  CCRS Gate        │                           │
│         │  LRT Detection    │                           │
│         │  Trigger Scout    │                           │
│         │  Pairwise Sort    │                           │
│         └─────────┬─────────┘                           │
│                   │                                     │
└───────────────────┼─────────────────────────────────────┘
                    │
        ┌───────────┼───────────────────┐
        │           │                   │
        ▼           ▼                   ▼
┌──────────┐ ┌─────────────┐ ┌──────────────────┐
│ Supabase │ │ External    │ │ Google Cloud     │
│          │ │ APIs        │ │                  │
│ Auth     │ │             │ │ Vision AI        │
│ Database │ │ Pollen API  │ │ (Trigger Scout)  │
│ RLS      │ │ Weather API │ │                  │
│ Realtime │ │ WAQI API    │ │ Pollen API       │
│          │ │ BatchData   │ │ Maps/Geocoding   │
│          │ │ Census API  │ │                  │
└──────────┘ └─────────────┘ └──────────────────┘
```

### Data Flow

#### Onboarding Flow

```
User enters address
  → Geocode via Google Maps API → lat/lng
  → BatchData API → year_built, home_type, sqft
  → Census ACS API → block-group median income → income_tier (silent)
  → NDVI satellite → neighborhood vegetation density
  → User answers 3 questions (pets, diagnosis, seasonal pattern)
  → Derive CCRS from state
  → Derive region from state
  → Save user_profile to Supabase
  → Seed user_allergen_elo from allergens table (regional seed list)
  → Run tournament engine (first prediction)
  → Display processing screen (4 seconds, 8 messages)
  → Show leaderboard (Trigger Champion + Final Four)
```

#### Check-in Flow

```
User submits check-in (symptoms, severity, timing, location)
  → Save symptom_checkins row with environmental snapshot
  → Fetch live data: Google Pollen API (UPI), OpenWeatherMap, WAQI
  → Tournament engine runs full 10-step order of operations:
    1. Global symptom gate check
    2. For each allergen in seed list:
       a. Get current Elo from user_allergen_elo
       b. Apply seasonal multiplier (region + month)
       c. Apply symptom-specificity multiplier (zone match)
       d. Run Monte Carlo (N=1000) with live weather + pollen
       e. Apply MC confidence boost
       f. Apply CCRS + indoor gate (cockroach)
       g. Apply Trigger Scout proximity multiplier
       h. Store Elo_final
    3. Pairwise tournament sort
    4. Top 4 = Final Four, Top 1 = Trigger Champion
    5. Map to confidence tier
    6. Save leaderboard snapshot to checkin row
    7. Update stored Elo (K-factor based on check-in count)
  → Return updated leaderboard to UI
```

### API Design

All API routes use Next.js App Router convention (`app/api/*/route.ts`). RESTful patterns. JSON request/response. Supabase client authenticated via `createServerClient` with cookies.

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/onboarding` | Submit onboarding data, trigger first tournament |
| POST | `/api/checkin` | Submit symptom check-in, re-run tournament |
| GET | `/api/leaderboard` | Get current leaderboard for user (or child) |
| GET | `/api/leaderboard/history` | Get leaderboard snapshots over time |
| GET | `/api/allergens` | Get allergen master list (public) |
| GET | `/api/allergens/seasonal` | Get seasonal calendar for region + month |
| POST | `/api/tournament/run` | Manually trigger tournament re-run |
| POST | `/api/trigger-scout/scan` | Upload photo, run Vision AI, match allergen |
| POST | `/api/locations` | Create/update saved places |
| POST | `/api/locations/travel` | Activate/deactivate Travel Mode |
| GET | `/api/children` | List child profiles |
| POST | `/api/children` | Create child profile |
| POST | `/api/referral/invite` | Generate referral link |
| GET | `/api/referral/status` | Check referral count and unlock status |
| GET | `/api/report/pdf` | Generate shareable PDF report |
| GET | `/api/health` | Health check (existing) |
| GET | `/api/error` | Test error for Sentry (existing) |
| POST | `/api/error-events` | Error event receiver (existing) |

## Data Models

### Core Entities

The full schema is pre-built in `AllergyMadness_schema_v1.sql`. Key entities:

| Table | Purpose | RLS |
|-------|---------|-----|
| `user_profiles` | User identity, home location, property data, CCRS, pets, onboarding answers, income_tier (silent) | Own profile only |
| `child_profiles` | Child profiles under a parent | Parent owns children |
| `allergens` | Master allergen table — 40+ allergens with particle sizes, Elo, SPP risk, LRT, Vision AI labels, PFAS | Public read |
| `seasonal_calendar` | 6-region x 12-month severity levels per allergen | Public read |
| `user_allergen_elo` | Per-user Elo score for each allergen, with positive/negative signal counts | Own Elo only |
| `user_locations` | Home + saved places with independent indoor profiles and CCRS | Own locations only |
| `symptom_checkins` | Check-in data with symptom booleans, environmental snapshot, tournament output | Own check-ins only |
| `trigger_scout_scans` | Plant photo scans with Vision AI results and Elo multiplier gating | Own scans only |
| `user_subscriptions` | Subscription tier managed by RevenueCat webhooks | Own subscription only |

### Entity Relationships

```
user_profiles (1)
  ├── child_profiles (0..5)
  ├── user_allergen_elo (many, per allergen + location)
  ├── user_locations (many, home + saved places)
  ├── symptom_checkins (many)
  ├── trigger_scout_scans (many)
  └── user_subscriptions (1)

allergens (many)
  ├── seasonal_calendar (many, per region + month)
  ├── user_allergen_elo (many, per user)
  └── trigger_scout_scans (many, matched scans)
```

## Project Structure

```
workshop/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Landing / home page
│   ├── globals.css                   # Tailwind base styles
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                        # Authenticated app routes
│   │   ├── onboarding/page.tsx       # Auto-populated onboarding flow
│   │   ├── dashboard/page.tsx        # Leaderboard + Trigger Champion
│   │   ├── checkin/page.tsx          # Symptom check-in form
│   │   ├── travel/page.tsx           # Travel Mode + Saved Places
│   │   ├── children/page.tsx         # Child profile management
│   │   ├── scout/page.tsx            # Trigger Scout photo scanner
│   │   └── settings/page.tsx         # Account, subscription, referrals
│   └── api/
│       ├── health/route.ts           # Health check (existing)
│       ├── error/route.ts            # Test error (existing)
│       ├── error-events/             # Error receiver (existing)
│       ├── onboarding/route.ts
│       ├── checkin/route.ts
│       ├── leaderboard/route.ts
│       ├── allergens/route.ts
│       ├── tournament/route.ts
│       ├── trigger-scout/route.ts
│       ├── locations/route.ts
│       ├── children/route.ts
│       ├── referral/route.ts
│       └── report/route.ts
├── lib/
│   ├── engine/                       # Tournament engine (server-side)
│   │   ├── elo.ts                    # Elo initialization, update, K-factor
│   │   ├── seasonal.ts              # Seasonal calendar gate + multipliers
│   │   ├── symptoms.ts              # Symptom-specificity weighting
│   │   ├── monte-carlo.ts           # Stokes' Law + 1000-sim exposure calc
│   │   ├── ccrs.ts                  # Cockroach indoor gate + CCRS scoring
│   │   ├── lrt.ts                   # Long-Range Transport detection
│   │   ├── trigger-scout.ts         # Vision AI matching + Elo multiplier
│   │   ├── tournament.ts            # Pairwise sort + Final Four selection
│   │   ├── confidence.ts            # Elo → confidence tier mapping
│   │   └── run.ts                   # Full 10-step order of operations
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   ├── server.ts                # Server Supabase client (cookies)
│   │   └── types.ts                 # Generated database types
│   ├── apis/
│   │   ├── pollen.ts                # Google Pollen API client
│   │   ├── weather.ts               # OpenWeatherMap client
│   │   ├── aqi.ts                   # WAQI API client
│   │   ├── batchdata.ts             # BatchData property lookup
│   │   ├── census.ts                # Census ACS income proxy
│   │   ├── vision.ts                # Google Cloud Vision AI
│   │   └── geocoding.ts             # Google Maps Geocoding
│   ├── data/
│   │   ├── allergens-seed.json      # Allergen master data (from reference)
│   │   └── batchdata-fixtures.json  # Mock property data for workshop
│   └── utils/
│       ├── referral.ts              # Referral link generation + tracking
│       └── pdf.ts                   # PDF report generation
├── components/
│   ├── ui/                          # shadcn/ui base components
│   ├── onboarding/                  # Onboarding flow components
│   ├── leaderboard/                 # Leaderboard + Trigger Champion card
│   ├── checkin/                     # Check-in form components
│   ├── scout/                       # Trigger Scout camera + results
│   └── shared/                      # Shared layout, nav, disclaimer
├── __tests__/
│   ├── engine/                      # Tournament engine unit tests
│   ├── api/                         # API route integration tests
│   └── components/                  # React component tests
├── docs/                            # Project documentation
├── scripts/                         # Dev scripts, hooks, doctor
├── CLAUDE.md
├── package.json
├── next.config.ts
├── render.yaml
├── tsconfig.json
├── vitest.config.ts
└── vitest.setup.ts
```

## Development Standards

### Code Style

- **Linting**: ESLint with `next/core-web-vitals` config (existing)
- **Formatting**: Prettier (add as dev dependency)
- **Naming**: camelCase for variables/functions, PascalCase for components/types, SCREAMING_SNAKE for constants
- **Imports**: Absolute imports via `@/` alias (configured in tsconfig)
- **Files**: kebab-case for file names (`monte-carlo.ts`, not `MonteCarlo.ts`)

### Testing Requirements

- **Unit tests**: All tournament engine modules (`lib/engine/`) must have tests
- **Integration tests**: All API routes must have at least one happy-path test
- **Component tests**: Key UI components (leaderboard, check-in form, onboarding) must render correctly
- **Coverage target**: 80% for `lib/engine/`, 60% overall
- **Test command**: `npm test` (Vitest)

### Documentation

- Code comments only where logic isn't self-evident (tournament math formulas get comments)
- API routes document their request/response shapes via TypeScript types
- Architecture decisions recorded in this document

### Code Review

- All changes via feature branches and PRs (trunk-based dev per CLAUDE.md)
- PR reviewer checks: tests pass, lint clean, no hardcoded URLs, no leaked secrets, FDA disclaimer present on new consumer-facing surfaces
- No direct commits to `main`

## Security

### Authentication

- Supabase Auth (email/password) via `@supabase/ssr` for server-side session management
- Session cookies for Next.js App Router (httpOnly, secure, sameSite)
- Protected routes via middleware (`middleware.ts`) redirecting unauthenticated users

### Authorization

- Supabase Row-Level Security on all tables — users can only read/write their own data
- Child profiles accessible only by parent (RLS policy: `auth.uid() = parent_id`)
- Allergens and seasonal_calendar are public read
- Income_tier never exposed in any API response

### Data Protection

- All API keys stored as environment variables (Render env vars, never committed)
- Census income data used as silent model weight only — never displayed, never labeled as "income"
- Referral links contain no health data
- Shareable PDF reports include disclaimer but no raw symptom data beyond the leaderboard
- HIPAA-eligible via Supabase BAA + data handling practices

## Scalability

### Current Targets

- Workshop: 1-10 concurrent users
- Launch: 100-1,000 concurrent users
- Monte Carlo simulation: 1,000 iterations per allergen per check-in (~20-40 allergens x 1000 sims = 20K-40K iterations per check-in, runs in < 2 seconds on Node.js)

### Scaling Strategy

- **Phase 1**: Single Render web service handles everything (sufficient for launch)
- **Phase 2**: If tournament engine becomes a bottleneck, extract to Google Cloud Run as a dedicated compute service — API routes proxy to it
- **Phase 3**: Supabase scales vertically; add read replicas if needed; cache allergen/seasonal data in-memory (rarely changes)

## Architecture Decision Records

### ADR-001: Next.js Web App Over React Native

- **Status**: Accepted
- **Context**: PRD specifies mobile-first. Workshop template provides Next.js starter on Render. Building native requires different tooling, deployment, and app store submission.
- **Decision**: Build as responsive Next.js web app for workshop and early launch. Migrate to React Native / Expo for native app store presence in Phase 2-3.
- **Consequences**: Faster time to working product; Trigger Scout camera access via browser APIs (limited on some devices); no app store presence initially; all tournament engine code is reusable when migrating to native.

### ADR-002: Tournament Engine Server-Side in Next.js

- **Status**: Accepted
- **Context**: Tournament engine requires API keys (Pollen, Weather, BatchData) that must not be exposed to the client. Runs 1000 Monte Carlo simulations per check-in.
- **Decision**: Tournament engine lives in `lib/engine/` and runs exclusively in Next.js API routes (server-side). Never imported by client components.
- **Consequences**: All API keys stay server-side; compute happens on Render; latency bounded by external API calls (Google Pollen, Weather) not by engine math; can extract to Cloud Run later without changing the engine code.

### ADR-003: Supabase for Auth + Database

- **Status**: Accepted
- **Context**: Product handles health-adjacent data (symptoms, allergen predictions). HIPAA-eligible architecture required. Schema is pre-built with RLS.
- **Decision**: Supabase with signed BAA. RLS on all tables. Supabase Auth for user management.
- **Consequences**: Zero custom auth code; RLS enforces data isolation at the database level; Supabase branching available for PR preview databases; HIPAA-eligible with BAA signed.

### ADR-004: Monolithic Deployment on Render

- **Status**: Accepted
- **Context**: Workshop build requires fastest path to working deployment. Render template already configured. Tournament engine compute is bounded (< 2 sec per check-in).
- **Decision**: Single Render web service running Next.js with all API routes and UI. PR preview environments enabled.
- **Consequences**: Simplest deployment model; single URL for all functionality; no inter-service communication overhead; can split later if needed; free tier sufficient for workshop.

### ADR-005: BatchData Mock Fixtures for Workshop

- **Status**: Accepted
- **Context**: BatchData API keys may take time to activate. Workshop cannot be blocked on external API readiness.
- **Decision**: Include static JSON fixtures in `lib/data/batchdata-fixtures.json` for known test addresses. API client falls back to fixtures when API is unavailable. Graceful fallback to manual entry when no data available.
- **Consequences**: Onboarding works even without live BatchData; workshop demo always succeeds; fixtures replaced by live API when key is active.
