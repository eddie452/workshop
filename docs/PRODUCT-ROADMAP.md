# Product Roadmap

## Overview

Allergy Madness is a mobile-first non-invasive allergy prediction platform built by Champ Health. The initial build happens during a 3-day workshop (Sunday-Tuesday), followed by a 2-4 week polish period before public launch. The product uses a tournament-style Elo engine inspired by sports handicapping to deliver instant allergen rankings, with every feature gated behind a global symptom check to ensure scientific integrity.

## Phase 1: MVP (Workshop Build)

- **Target**: 3-day workshop build (Sunday-Tuesday, March 2026)
- **Goal**: Deliver a working app that predicts allergen triggers instantly on first use and updates predictions live with every check-in

### Features

| Feature | Priority | Status | Effort |
|---------|----------|--------|--------|
| Supabase schema deployment (schema_v1.sql) | P0 | Backlog | S |
| Allergen seed data load (allergens_seed.json) | P0 | Backlog | S |
| Seasonal calendar data load (6 regions x 12 months) | P0 | Backlog | S |
| User auth (Supabase Auth — email/password) | P0 | Backlog | S |
| Auto-populated onboarding (BatchData + Census + 3 questions) | P0 | Backlog | M |
| 4-second processing screen (8 sequential messages) | P0 | Backlog | S |
| Tournament engine — Elo scoring with seasonal multipliers | P0 | Backlog | L |
| Tournament engine — symptom-specificity weighting | P0 | Backlog | M |
| Tournament engine — Monte Carlo exposure simulation (1000 sims) | P0 | Backlog | M |
| Tournament engine — CCRS cockroach indoor gate | P0 | Backlog | M |
| Tournament engine — pairwise tournament sort | P0 | Backlog | M |
| Tournament engine — Elo update after check-in (K-factor decay) | P0 | Backlog | M |
| Leaderboard UI — Trigger Champion + blurred Final Four | P0 | Backlog | M |
| Daily check-in — symptom zone capture + environmental snapshot | P0 | Backlog | M |
| Environmental Forecast mode (no symptoms = no scoring) | P0 | Backlog | S |
| 6-region seasonal allergen calendars | P0 | Backlog | S |
| FDA disclaimer + mandatory acknowledgment step | P0 | Backlog | S |
| Referral link generation and tracking (3-friend unlock) | P1 | Backlog | M |
| Travel Mode — Active Travel (GPS displacement detection) | P1 | Backlog | L |
| Saved Places — recurring locations with independent profiles | P1 | Backlog | M |
| Child profiles (up to 5 per parent) | P1 | Backlog | M |
| Trigger Scout plant photo ID (Vision AI) | P1 | Backlog | L |
| Food cross-reactivity panel (PFAS mapping) | P1 | Backlog | M |
| LRT detection — NOAA HYSPLIT wind trajectory | P1 | Backlog | L |
| Freemium gate UI (blurred cards + unlock modal) | P1 | Backlog | M |
| Shareable PDF report (leaderboard + disclaimer) | P1 | Backlog | M |

### Success Criteria

- [ ] Onboarding completes in < 3 minutes (median)
- [ ] Tournament engine returns Trigger Champion + Final Four on first use
- [ ] Check-in re-runs tournament and updates leaderboard in real time
- [ ] Symptom gate correctly suppresses all scoring when severity = 0
- [ ] CCRS gate correctly handles cockroach across all 4 tiers
- [ ] All consumer-facing surfaces display FDA disclaimer

## Phase 2: Launch Polish (Post-Workshop)

- **Target**: 2-4 weeks after workshop (April 2026)
- **Goal**: Enable monetization, app store submission, and referral-driven growth

### Features

| Feature | Priority | Status |
|---------|----------|--------|
| Enable RevenueCat paywall (PAYWALL_ENABLED=true) | P0 | Backlog |
| Configure App Store + Google Play in-app purchase products | P0 | Backlog |
| App Store submission with health category disclosures | P0 | Backlog |
| Referral tracking in Supabase (referral_events table) | P0 | Backlog |
| Champ Allergy Toothpaste cross-sell (brush50 discount reveal) | P1 | Backlog |
| Madness+ Family tier billing ($9.99/mo) | P1 | Backlog |
| Push notifications for check-in reminders | P1 | Backlog |
| Onboarding A/B testing (completion rate optimization) | P2 | Backlog |

### Success Criteria

- [ ] Onboarding completion > 80%
- [ ] Day-1 check-in rate > 70%
- [ ] Day-7 retention > 45%
- [ ] App Store approval received

## Phase 3: Growth (3-6 Months Post-Launch)

- **Target**: July-September 2026
- **Goal**: Scale monetization, add direct billing, validate model accuracy

### Features

| Feature | Priority | Status |
|---------|----------|--------|
| Stripe direct billing for HSA/FSA card support | P0 | Backlog |
| "Pay directly" option bypassing App Store | P1 | Backlog |
| Madness+ annual plan ($49.99/year) | P1 | Backlog |
| Model accuracy validation (perceived accuracy survey) | P0 | Backlog |
| B2B / enterprise licensing via Stripe invoicing | P2 | Backlog |
| Apple Small Business Program enrollment (15% commission) | P1 | Backlog |
| Advanced analytics dashboard (engagement, conversion) | P2 | Backlog |

### Success Criteria

- [ ] Perceived accuracy > 65% ("feels accurate" for top-3)
- [ ] PDF report export > 25% of active users
- [ ] Madness+ conversion rate established

## Milestone Definitions

| Milestone | Criteria | Target Date |
|-----------|----------|-------------|
| M1: Workshop Build Complete | Core tournament engine + leaderboard + check-in working end-to-end | End of workshop (April 2026) |
| M2: App Store Launch | App approved, paywall enabled, referral tracking live | April-May 2026 |
| M3: Product-Market Fit | Day-7 retention > 45%, perceived accuracy > 65% | July 2026 |
| M4: Monetization | Stripe HSA/FSA live, Madness+ Family tier billing active | September 2026 |

## Constraints and Risks

| Risk | Phase | Mitigation |
|------|-------|------------|
| FDA SaMD classification challenge | 2 | Legal review before public launch; "wellness screening tool" framing; disclaimer on all surfaces |
| BatchData API unavailable at workshop | 1 | Static JSON fixture for known properties; graceful fallback to manual entry |
| App Store rejection for health claims | 2 | Disclaimer language per PRD Section 2; avoid "test" without screening-tool qualifier |
| Low model accuracy perception | 2-3 | Processing screen communicates sophistication; confidence tiers; "improves with every check-in" messaging |
| API rate limits during workshop | 1 | Free tiers sufficient; cache responses; mock data as fallback |

## Dependencies

```text
Phase 1: Workshop Build
    Database (Supabase schema + seed data)
    -> Tournament Engine (Elo + Monte Carlo + pairwise sort)
    -> Onboarding (BatchData + Census + processing screen)
    -> Leaderboard UI + Check-in
    -> Travel Mode + Child Profiles + Trigger Scout + PFAS + LRT
    |
    v
Phase 2: Launch Polish (requires working MVP from Phase 1)
    -> RevenueCat paywall + App Store submission
    -> Referral tracking + cross-sell
    |
    v
Phase 3: Growth (requires app store approval + user data from Phase 2)
    -> Stripe HSA/FSA + accuracy validation + B2B
```

## Engineering Reference

Pre-built artifacts available for implementation:

- **Database schema**: `AllergyMadness_schema_v1.sql` — ready to deploy to Supabase
- **Allergen seed data**: `AllergyMadness_allergens_seed.json` — 40+ allergens with all fields
- **Elo math specification**: `AllergyMadness_elo_math_spec.md` — complete tournament engine logic with code examples
- **Scientific foundation**: Computational Allergology research paper — validates 0.801 balanced predictive accuracy

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-03-29 | Initial roadmap from PRD v4.0 | Bootstrap Phase 1 |
