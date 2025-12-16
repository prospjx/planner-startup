"use client";

import Link from "next/link";
import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      alert("Signed in with Google (Firebase)");
    } catch (error) {
      console.error("Google sign-in failed", error);
      alert("Google sign-in failed. Check console and Firebase config.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-16">
        <Link href="/" className="text-sm text-slate-400 hover:text-emerald-300">
          ← Back to home
        </Link>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Login</p>
          <h1 className="mt-2 text-3xl font-semibold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-slate-300">
            Connect your Google account to sync tasks to Calendar.
          </p>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-4 py-3 text-base font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Connecting..." : "Continue with Google"}
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Uses Firebase Web SDK + GoogleAuthProvider. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set.
          </p>
        </div>
      </div>
    </main>
  );
}
