import { PlannerTask } from "./WeeklyPlanner";

type TaskApprovalModalProps = {
  tasks: PlannerTask[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestAlternative: (id: string) => void;
};

export function TaskApprovalModal({ tasks, onApprove, onReject, onRequestAlternative }: TaskApprovalModalProps) {
  const pending = tasks.filter((t) => t.status === "pending");

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-slate-300">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Approvals</h2>
          <span className="text-xs text-emerald-400">All clear</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">No pending tasks to approve.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-slate-300 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Approvals</h2>
        <span className="text-xs text-amber-300">{pending.length} pending</span>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {pending.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{task.title}</p>
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                      AI Suggested
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {task.day} · {task.time}
                  </p>
                  {task.deadline && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Deadline: {new Date(task.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-300">
                    Priority: <span className="font-semibold uppercase text-amber-300">{task.priority}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <button
                  className="rounded-full bg-emerald-400 px-3 py-1.5 text-emerald-950 transition hover:-translate-y-0.5 hover:shadow hover:shadow-emerald-400/30"
                  onClick={() => onApprove(task.id)}
                >
                  ✓ Approve
                </button>
                <button
                  className="rounded-full bg-rose-500 px-3 py-1.5 text-rose-50 transition hover:-translate-y-0.5 hover:shadow hover:shadow-rose-500/30"
                  onClick={() => onReject(task.id)}
                >
                  ✗ Reject
                </button>
                <button
                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300 transition hover:border-blue-400/50 hover:text-blue-200"
                  onClick={() => onRequestAlternative(task.id)}
                >
                  ↻ Request Alternatives
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
