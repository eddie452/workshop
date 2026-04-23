import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { NavBar } from "@/components/layout";
import {
  FDA_DISCLAIMER_LABEL,
  FDA_DISCLAIMER_FULL_TEXT,
} from "@/components/shared/fda-disclaimer";

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
    <div className="min-h-screen bg-white">
      {/* Unified navigation (unauthenticated variant) */}
      <NavBar authState="unauthenticated" />

      {/* Hero Section */}
      <section className="bg-dusty-denim px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
          <h1
            className="break-words text-3xl font-bold tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Allergy Madness
          </h1>
          <p className="mt-2 text-base text-white">
            by Champ Allergy
          </p>
          <p className="mt-4 max-w-xl break-words text-lg text-white/90 sm:mt-6 sm:text-xl">
            Predict Your Allergy Triggers
          </p>
          <p className="mt-2 max-w-xl break-words text-base text-white/80">
            Track symptoms, discover patterns, and get personalized insights
            about what may be causing your allergies — all from your phone.
          </p>
          <div className="mt-8 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-button bg-nature-pop px-8 py-4 text-center text-base font-semibold text-dusty-denim shadow-sm transition-colors hover:bg-nature-pop sm:w-auto"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-button border border-white/40 px-8 py-4 text-center text-base font-medium text-white transition-colors hover:border-white hover:bg-white/10 sm:w-auto"
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
      <section className="bg-dusty-denim px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-center text-2xl font-bold text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            How It Works
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-white/80">
            Three simple steps to understanding your allergy triggers.
          </p>
          <div className="mt-12 grid items-start gap-6 sm:grid-cols-3">
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
      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-center text-2xl font-bold text-dusty-denim sm:text-3xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Features
          </h2>
          <div className="mt-12 grid auto-rows-fr gap-6 sm:grid-cols-2">
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
      <section className="bg-dusty-denim px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
          <h2
            className="break-words text-2xl font-bold text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Ready to Understand Your Allergies?
          </h2>
          <p className="mt-3 max-w-xl break-words text-white/80">
            Join thousands of families using Allergy Madness to track and
            predict allergy triggers.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center justify-center rounded-button bg-nature-pop px-8 py-4 text-center text-base font-semibold text-dusty-denim shadow-sm transition-colors hover:bg-nature-pop"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-champ-blue bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* FDA Disclaimer */}
          <div className="rounded-card border border-champ-blue bg-white px-4 py-3">
            <p className="break-words text-sm font-semibold text-dusty-denim">
              {FDA_DISCLAIMER_LABEL}
            </p>
            <p className="mt-1 break-words text-xs text-dusty-denim">
              {FDA_DISCLAIMER_FULL_TEXT}
            </p>
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-dusty-denim">
              Allergy Madness — The Digital Allergy Test by Champ Allergy
            </p>
            <p className="text-xs text-dusty-denim">
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-champ-blue">
        {step}
      </div>
      <h3 className="mt-4 break-words text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 break-words text-sm text-white/80">{description}</p>
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
    <div className="flex h-full flex-col rounded-card border border-champ-blue bg-white p-6">
      <h3 className="break-words text-base font-semibold text-dusty-denim">{title}</h3>
      <p className="mt-2 break-words text-sm text-dusty-denim">{description}</p>
    </div>
  );
}
