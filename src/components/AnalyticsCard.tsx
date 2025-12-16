type AnalyticsCardProps = {
  title: string;
  value: string;
  hint?: string;
  variant?: "default" | "success" | "warning";
};

export function AnalyticsCard({ title, value, hint, variant = "default" }: AnalyticsCardProps) {
  const accents: Record<typeof variant, string> = {
    default: "border-slate-800 bg-slate-900/60",
    success: "border-emerald-500/30 bg-emerald-500/10",
    warning: "border-amber-400/40 bg-amber-400/10",
  } as const;

  return (
    <div
      className={`rounded-2xl border px-4 py-5 text-white shadow-lg shadow-black/30 ${accents[variant]}`}
    >
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
