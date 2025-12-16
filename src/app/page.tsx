import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-20 sm:px-10">
        <header className="flex flex-col gap-4 text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Student Planner
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Plan your week, sync your calendar, and ship assignments on time.
          </h1>
          <p className="max-w-2xl text-lg text-slate-200/80">
            Sign in with Google, auto-generate a balanced schedule, and approve
            the plan before it lands on your calendar.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-base font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-400/30"
            >
              Continue with Google
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-3 text-base font-semibold text-white transition hover:border-emerald-400/70 hover:text-emerald-100"
            >
              View planner demo
            </Link>
          </div>
        </header>

        <section className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold text-white">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Upload docs", "AI schedule", "Calendar sync"].map((step) => (
              <div
                key={step}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200/80"
              >
                <p className="text-base font-semibold text-white">{step}</p>
                <p className="mt-2 text-slate-300/80">
                  Placeholder copy describing this step. Replace with real
                  workflow details.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
