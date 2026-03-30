# Product Requirements Document

## Product Overview

- **Name**: Allergy Madness — The Digital Allergy Test by Champ Health
- **Type**: Mobile app (iOS/Android) — React Native / Expo, mobile-first
- **Category**: B2C Consumer — Healthcare/Wellness
- **License**: BSL 1.1 (converts to Apache 2.0 after 3 years per release)

## Vision and Problem Statement

### Problem

Allergy sufferers don't know which specific allergens trigger their symptoms. Clinical allergy testing is invasive, expensive, and often inaccessible. Journaling apps have poor retention because they make users wait days for insights — first impression IS the product, and delayed results kill engagement.

### Vision

Every allergy sufferer gets an instant, personalized allergen prediction the moment they open the app — no blood draws, no scratch tests, no waiting period — powered by a live-updating tournament engine that learns with every check-in.

### How People Solve This Today

- **Clinical allergy tests** (skin prick, serum IgE): Expensive ($200-$1,000+), require specialist visit, invasive, inaccessible in many areas
- **Journaling/tracking apps**: Poor retention (industry avg ~50% onboarding completion); users must log symptoms for 5+ days before receiving any insight
- **Generic pollen count apps**: Show what's in the air but provide zero personalization — no ranking, no prediction, no learning
- **Living with it**: Most allergy sufferers never get tested and self-medicate with OTC antihistamines without knowing their specific triggers

## Target Audience

### Primary Users

- **Who**: Working parents (the "Champ mom") managing family allergy symptoms who need to identify triggers quickly without expensive clinical testing
- **Pain Point**: Not knowing which specific allergens cause symptoms, and existing solutions require either invasive testing or weeks of journaling before any insights
- **Current Solution**: Self-medicating with OTC antihistamines, occasional expensive allergist visits, or just living with symptoms

### Secondary Users

- **Parents managing children's allergies**: Child profiles (up to 5) allow parents to track multiple family members under one account
- **Physician-referred users**: Users who export PDF reports to share with their allergist or primary care provider for clinical follow-up

## Features

### MVP (Must Have)

- [ ] **Auto-populated onboarding** (under 3 minutes): BatchData property lookup (year built, type, sqft), Census ACS income proxy, location permission, 3 user questions (pets, prior diagnosis, seasonal pattern), 4-second processing screen with 8 sequential on-brand messages
- [ ] **Live-updating tournament engine**: Elo scoring with seasonal calendar weighting, symptom-specificity multipliers (upper/lower respiratory, ocular, dermal, systemic), Monte Carlo exposure simulation (1000 sims using Stokes' Law settling velocity + weather data), CCRS cockroach indoor gate, pairwise tournament sort
- [ ] **Instant leaderboard**: Trigger Champion + Final Four display on first use; Final Four #2-4 blurred for free-tier users with pulse animation on lock icons; "Predicted Triggers — Not a Diagnosis" persistent label
- [ ] **Daily check-in with symptom zone capture**: Severity (0-3), symptom checkboxes grouped by zone (upper respiratory, ocular, lower respiratory, dermal, ear, systemic), timing (morning/midday/evening/all day), indoor/outdoor context; environmental snapshot fetched server-side (pollen UPI, AQI, weather)
- [ ] **6-region seasonal allergen calendars**: Northeast, Midwest, Northwest, South Central, Southeast, Southwest; month-by-month severity (inactive/mild/moderate/severe) for all allergens; maps to Elo multipliers (0.0x/1.2x/2.0x/3.0x)
- [ ] **Referral link generation and tracking**: Unique referral link per user; 3-friend referral unlocks all features permanently; share via native iOS/Android share sheet; progress tracker ("2 of 3 friends invited")
- [ ] **Travel Mode / Saved Places**: Active Travel (re-seeds tournament for current GPS location, recalculates seasonal calendars and LRT sources, preserves home Elo history) and Saved Places (recurring locations with independent allergen profiles, indoor context questions, construction type for international locations)
- [ ] **Child profiles (Family tier)**: Up to 5 child profiles per parent; independent Elo histories, check-ins, and leaderboards; parent-managed
- [ ] **Trigger Scout plant photo ID**: Google Cloud Vision AI plant recognition; match against allergen seed database vision_labels; 2.5x Elo multiplier gated on symptoms + seasonal/API confirmation; dormant scan badge when conditions not met
- [ ] **Food cross-reactivity panel (PFAS)**: Pollen-Food Allergy Syndrome mapping from allergen seed data; birch-apple, ragweed-melon, grass-peach clusters; visible for Madness+ users when a pollen allergen with known cross-reactivity appears in top 5
- [ ] **NOAA HYSPLIT wind trajectory for LRT**: Long-Range Transport detection for cedar/juniper (1000+ mi), ragweed (400 mi), bermuda (100 mi), pine (300 mi), olive (100 mi); source region bloom check + wind trajectory confirmation + distance decay; Cedar Fever as primary use case
- [ ] **Freemium monetization structure**: Free tier (Trigger Champion visible, Final Four blurred, 3 check-ins/month, Environmental Forecast mode); unlock via 3-friend referral OR Madness+ purchase; RevenueCat integration with PAYWALL_ENABLED=false for workshop build
- [ ] **Regulatory compliance**: FDA disclaimer on all consumer-facing surfaces; mandatory acknowledgment step before first leaderboard; "Predicted Triggers — Not a Diagnosis" persistent label; shareable PDF report with full disclaimer footer

### Out of Scope (v1)

- RevenueCat paywall activation (code ready, PAYWALL_ENABLED=false — enabled post-workshop)
- Stripe direct billing / HSA/FSA card payments (v3, 3-6 months post-launch)
- App Store and Google Play in-app purchase product configuration (v2, 2-4 weeks post-workshop)
- Madness+ Family tier pricing ($9.99/mo) — child profiles ship in MVP but family billing is v2

### Core Value Proposition

Deliver a meaningful, ranked allergen prediction the moment onboarding completes — and update it in real time with every check-in. No waiting period. No invasive testing. Instant value.

## Success Metrics

| Metric | Target (3 months) |
|--------|-------------------|
| Time to first leaderboard result | < 3 minutes from app open |
| Onboarding completion rate | > 80% |
| Onboarding time (median) | < 3 minutes |
| Day-1 check-in rate | > 70% of onboarded users |
| Day-7 retention | > 45% |
| PDF report export rate | > 25% of active users |
| Perceived accuracy | > 65% rate top-3 as "feels accurate" |

## Competitive Analysis

| Competitor | Strength | Weakness | Our Differentiator |
|-----------|----------|----------|---------------------|
| Clinical allergy tests (SPT/sIgE) | Gold standard accuracy | Expensive, invasive, requires specialist | Non-invasive, instant, accessible from phone |
| Journaling apps (Klarify, etc.) | Structured symptom tracking | 5+ day delay before insights; poor retention | Instant prediction on first use; live updates every check-in |
| Pollen count apps (Pollen.com, Weather.com) | Real-time pollen data | No personalization, no ranking, no learning | Personalized tournament engine that learns from YOUR symptoms |
| No action (OTC self-medication) | Zero effort | No understanding of specific triggers | Identifies likely triggers to enable targeted avoidance |

## Constraints and Requirements

- **Timeline**: Workshop build Sunday-Tuesday (3 days); post-workshop launch 2-4 weeks after
- **Budget**: API costs near $0 for workshop (free tiers); BatchData at $0.01/lookup in production
- **Technical**: React Native / Expo; Supabase (HIPAA-eligible with BAA); Google Cloud (Cloud Run, Pollen API, Vision AI, Maps); Render.com for hosting
- **Regulatory**: FDA SaMD classification must be resolved before public launch; HIPAA-eligible architecture required; FDA disclaimer on all consumer-facing surfaces

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Security | Supabase RLS on all tables; HIPAA-eligible architecture with BAA; Census income data never displayed or labeled; env vars in Secret Manager, never committed |
| Performance | Tournament engine completes in < 4 seconds (processing screen duration); onboarding auto-fill < 2 seconds |
| Scalability | Supabase handles concurrent users; Cloud Run auto-scales tournament engine |
| Accessibility | Standard React Native accessibility; high-contrast leaderboard for readability |
| Privacy | Income tier used as silent model weight only; location data encrypted; referral links contain no health data |

## Dependencies

- **Google Pollen API** — species-level pollen data on 1x1km grid (GOOGLE_POLLEN_API_KEY)
- **Google Maps / Geocoding API** — address-to-lat/lng, NDVI vegetation density (GOOGLE_MAPS_API_KEY)
- **Google Cloud Vision AI** — Trigger Scout plant photo identification (GOOGLE_APPLICATION_CREDENTIALS)
- **OpenWeatherMap API** — wind speed, humidity, temperature, precipitation for Monte Carlo sims (OPENWEATHER_API_KEY)
- **World Air Quality Index (WAQI)** — PM2.5, PM10, AQI for environmental dashboard (WAQI_API_TOKEN)
- **BatchData API** — property year built, type, square footage at onboarding (BATCHDATA_API_KEY)
- **US Census Bureau ACS API** — block-group median household income proxy (CENSUS_API_KEY)
- **RevenueCat** — cross-platform subscription management (REVENUECAT_IOS_SDK_KEY, REVENUECAT_ANDROID_SDK_KEY)
- **Supabase** — database, auth, RLS (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- **Render.com** — application hosting with PR preview environments

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FDA SaMD classification challenge | High | Frame as "wellness screening tool"; mandatory disclaimer on all surfaces; legal review before public launch |
| BatchData API unavailable at workshop start | Medium | Mock with static JSON fixture for known properties; graceful fallback to manual entry |
| Google Pollen API key activation delay | Medium | Keys take up to 2 hours to activate; sign up before workshop; use cached seed data as fallback |
| App Store rejection for health claims | High | Disclaimer language (Section 2 of PRD) crafted for approval; avoid word "test" without screening-tool qualifier |
| Low perceived accuracy in early use | Medium | Processing screen communicates sophistication; confidence tiers set expectations; "sharpens with every check-in" messaging |
| HIPAA compliance gaps | High | Supabase BAA signed; Census income never labeled; all PII encrypted; no health data in referral links |

## Glossary

| Term | Definition |
|------|------------|
| Trigger Champion | The #1 ranked allergen on a user's leaderboard — the predicted most likely trigger |
| Final Four | The top 4 ranked allergens after pairwise tournament sort |
| Elo Score | A rating (scale ~100-3000, centered at 1000) representing an allergen's likelihood of being the user's trigger, dynamically updated with each check-in |
| CCRS | Cockroach Climate Risk Score (0-3) — geographic risk tier determining cockroach allergen seeding |
| SPP | Sub-Pollen Particle — fragments <2.5 micrometers from ruptured pollen grains that penetrate lower airways; primary cause of thunderstorm asthma |
| LRT | Long-Range Transport — pollen species capable of traveling 100-1000+ miles from source (e.g., Cedar Fever from Texas Hill Country) |
| UPI | Universal Pollen Index — standardized 0-5 scale for pollen exposure risk across regions and plant types |
| PFAS | Pollen-Food Allergy Syndrome — cross-reactivity where pollen sensitization causes oral reactions to structurally similar food proteins |
| Symptom Gate | Global rule: no symptoms = no scoring. All Elo weights suppressed to 0 when user reports no symptoms; leaderboard switches to Environmental Forecast mode |
| Environmental Forecast | Display mode when user has no symptoms — shows what's in the air without making causal predictions |
| Madness+ | Premium subscription tier ($6.99/month or $49.99/year) unlocking all features |

## Engineering Reference Artifacts

The following pre-built engineering artifacts are available in the project:

| Artifact | Contents |
|----------|----------|
| `AllergyMadness_allergens_seed.json` | Complete allergen database (40+ allergens) with particle sizes, settling velocities, SPP risk, LRT data, PFAS cross-reactive foods, Google Vision AI labels, regional presence |
| `AllergyMadness_elo_math_spec.md` | Full Elo tournament math specification — initialization, seasonal multipliers, symptom-specificity boosts, Monte Carlo simulation, CCRS gate, K-factor updates, pairwise sort, confidence tiers, 10-step order of operations |
| `AllergyMadness_schema_v1.sql` | Supabase database schema with RLS — user_profiles, child_profiles, allergens, seasonal_calendar, user_allergen_elo, user_locations, symptom_checkins, trigger_scout_scans, user_subscriptions |
| `Computational Allergology` (research paper) | Scientific foundation — aerobiology, Stokes' Law, UPI, NHANES predictors, sports-betting handicapping model, PFAS cross-reactivity, FDA regulatory framing, 0.801 balanced predictive accuracy |

## Regulatory Disclaimer

> **IMPORTANT — NOT AN FDA-APPROVED DIAGNOSTIC TEST**
>
> Allergy Madness is a wellness screening and predictive information tool. It is NOT an FDA-approved diagnostic test, medical device, or clinical diagnostic system. Allergy Madness does not diagnose, treat, cure, or prevent any disease or medical condition. All users should consult a licensed medical provider before making any changes to medication, diet, or lifestyle based on information provided by this application.
