import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  FDA_DISCLAIMER_LABEL,
  FDA_DISCLAIMER_FULL_TEXT,
} from "@/components/shared/fda-disclaimer";
import { NavHeader } from "@/components/layout";

/**
 * Root Landing Page
 *
 * - Authenticated users with completed profile → redirect to /dashboard
 * - Authenticated users without profile → redirect to /onboarding
 * - Unauthenticated users → branded landing page
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if onboarding is complete
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("home_region")
      .eq("id", user.id)
      .single();

    const profile = profileData as { home_region: string | null } | null;
    if (profile?.home_region) {
      redirect("/dashboard");
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-brand-surface">
      {/* Navigation — unified component */}
      <NavHeader isAuthenticated={false} />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-primary to-brand-primary-dark px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="text-3xl font-bold tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Allergy Madness
          </h1>
          <p className="mx-auto mt-2 text-base text-brand-primary-light">
            by Champ Allergy
          </p>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90 sm:mt-6 sm:text-xl">
            Predict Your Allergy Triggers
          </p>
          <p className="mx-auto mt-2 max-w-xl text-base text-white/80">
            Track symptoms, discover patterns, and get personalized insights
            about what may be causing your allergies — all from your phone.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/signup"
              className="w-full rounded-button bg-brand-accent px-8 py-3 text-center text-base font-semibold text-brand-primary-dark shadow-sm transition-colors hover:bg-brand-accent-dark sm:w-auto"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="w-full rounded-button border border-white/40 px-8 py-3 text-center text-base font-medium text-white transition-colors hover:border-white hover:bg-white/10 sm:w-auto"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-3 text-sm text-white/70">
            No credit card required. Free plan available.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-brand-primary-dark px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-center text-2xl font-bold text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            How It Works
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-white/80">
            Three simple steps to understanding your allergy triggers.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <StepCard
              step="1"
              title="Quick Onboarding"
              description="Tell us your zip code and a few health details. We auto-detect your local environment."
            />
            <StepCard
              step="2"
              title="Daily Check-ins"
              description="Log how you feel each day in under 30 seconds. Our engine tracks patterns over time."
            />
            <StepCard
              step="3"
              title="See Your Triggers"
              description="View a ranked leaderboard of your predicted allergy triggers with confidence scores."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-brand-primary-light px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-center text-2xl font-bold text-brand-primary-dark sm:text-3xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Features
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <FeatureCard
              title="Symptom Check-in"
              description="Log severity, body zones, and timing each day. Takes less than 30 seconds."
            />
            <FeatureCard
              title="Trigger Leaderboard"
              description="See your top allergens ranked by our Elo-based prediction engine."
            />
            <FeatureCard
              title="Trigger Scout"
              description="Snap a photo of food or products. Our AI identifies potential allergens."
            />
            <FeatureCard
              title="Environmental Forecast"
              description="Get pollen, air quality, and weather data tailored to your location."
            />
            <FeatureCard
              title="Child Profiles"
              description="Track allergy triggers for your kids alongside your own profile."
            />
            <FeatureCard
              title="PDF Reports"
              description="Download shareable reports to bring to your allergist appointments."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-brand-primary to-brand-primary-dark px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-2xl font-bold text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Ready to Understand Your Allergies?
          </h2>
          <p className="mt-3 text-white/80">
            Join thousands of families using Allergy Madness to track and
            predict allergy triggers.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-button bg-brand-accent px-8 py-3 text-base font-semibold text-brand-primary-dark shadow-sm transition-colors hover:bg-brand-accent-dark"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {/* FDA Disclaimer */}
          <div className="rounded-card border border-brand-border bg-brand-primary-light px-4 py-3">
            <p className="text-sm font-semibold text-brand-primary-dark">
              {FDA_DISCLAIMER_LABEL}
            </p>
            <p className="mt-1 text-xs text-brand-text-secondary">
              {FDA_DISCLAIMER_FULL_TEXT}
            </p>
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-brand-text-secondary">
              Allergy Madness — The Digital Allergy Test by Champ Allergy
            </p>
            <p className="text-xs text-brand-text-muted">
              &copy; {new Date().getFullYear()} Champ Allergy. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components (co-located, not exported)                           */
/* ------------------------------------------------------------------ */

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-primary">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/80">{description}</p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-card border border-brand-border bg-white p-6">
      <h3 className="text-base font-semibold text-brand-primary-dark">{title}</h3>
      <p className="mt-2 text-sm text-brand-text-secondary">{description}</p>
    </div>
  );
}
