export type PlannerTask = {
  id: string;
  title: string;
  day: string; // e.g. "Mon"
  time: string; // e.g. "9:00 AM"
  deadline?: string; // ISO date string
  priority: "low" | "medium" | "high";
  status: "scheduled" | "pending" | "completed" | "rejected";
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  const hour = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3].toUpperCase();
  const normalizedHour = (hour % 12) + (meridian === "PM" ? 12 : 0);
  return normalizedHour * 60 + minutes;
}

type WeeklyPlannerProps = { tasks: PlannerTask[]; view?: "week" | "month" };

export function WeeklyPlanner({ tasks, view = "week" }: WeeklyPlannerProps) {
  // Week of Dec 14-20, 2025 to mirror the provided mock
  const weekStart = new Date(2025, 11, 14);
  const weekDays = days.map((day, idx) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + idx);
    return {
      key: day,
      label: day.toUpperCase(),
      dateNumber: date.getDate(),
      isHighlighted: idx === 0, // highlight Monday 14 like the mock
    };
  });

  const priorityStyles: Record<PlannerTask["priority"], string> = {
    high: "border-amber-200 bg-amber-50 text-amber-900",
    medium: "border-blue-200 bg-blue-50 text-blue-900",
    low: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const MonthHeader = (
    <div className="flex items-center justify-between px-6 pt-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">December 2025</h2>
        <p className="text-sm text-slate-500">Month</p>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <button className="rounded-lg px-3 py-1.5 hover:bg-slate-100">Today</button>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 hover:bg-slate-100">‹</button>
          <button className="rounded-lg p-1.5 hover:bg-slate-100">›</button>
        </div>
      </div>
    </div>
  );

  if (view === "month") {
    // Month view: Dec 2025 grid similar to Google Calendar
    const currentMonth = new Date(2025, 11, 1); // December 2025
    const daysInMonth = new Date(2025, 12, 0).getDate();
    const firstDay = currentMonth.getDay(); // 0=Sun
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    const calendarDays = Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - firstDay + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      return dayNum;
    });

    return (
      <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm">
        {MonthHeader}
        <div className="mt-4 border-t border-slate-200">
          <div className="grid grid-cols-7 border-b border-slate-200 px-5 py-3">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 px-5 pb-6">
            {calendarDays.map((dayNum, idx) => (
              <div
                key={idx}
                className={`min-h-[120px] border-b border-r border-slate-200 p-3 last:border-r-0 ${
                  dayNum ? "bg-white" : "bg-slate-50"
                }`}
              >
                {dayNum && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{dayNum}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default: week view
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">December 2025</h2>
          <p className="text-sm text-slate-500">Week view</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <button className="rounded-lg px-3 py-1.5 hover:bg-slate-100">Today</button>
          <div className="flex items-center gap-1">
            <button className="rounded-lg p-1.5 hover:bg-slate-100">‹</button>
            <button className="rounded-lg p-1.5 hover:bg-slate-100">›</button>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200">
        <div className="grid grid-cols-7 gap-0 border-b border-slate-200 px-5 py-3">
          {weekDays.map((day) => (
            <div key={day.key} className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{day.label}</span>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  day.isHighlighted ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {day.dateNumber}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-4 px-5 pb-6 pt-4">
          {weekDays.map((day) => {
            const dayTasks = tasks
              .filter((task) => task.day === day.key)
              .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

            return (
              <div key={day.key} className="min-h-[260px] rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="space-y-2">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-lg border px-3 py-2 text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                        priorityStyles[task.priority]
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-slate-700">{task.time}</div>
                      <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                        {task.priority === "high" ? "High priority" : task.priority === "medium" ? "Medium" : "Low"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
