"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-dusty-denim">
        Create your account
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-card border border-alert-red bg-white p-3 text-sm text-alert-red">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-dusty-denim"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-button border border-champ-blue px-3 py-2 text-sm focus:border-champ-blue focus:outline-none focus:ring-1 focus:ring-champ-blue"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-dusty-denim"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-button border border-champ-blue px-3 py-2 text-sm focus:border-champ-blue focus:outline-none focus:ring-1 focus:ring-champ-blue"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-dusty-denim"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-button border border-champ-blue px-3 py-2 text-sm focus:border-champ-blue focus:outline-none focus:ring-1 focus:ring-champ-blue"
            placeholder="Re-enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-dusty-denim px-4 py-2 text-sm font-medium text-white hover:bg-dusty-denim/80 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-dusty-denim">
        Already have an account?{" "}
        <Link href="/login" className="text-champ-blue hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
