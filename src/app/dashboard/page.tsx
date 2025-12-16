"use client";

import { useMemo, useState } from "react";
import { TaskApprovalModal } from "@/components/TaskApprovalModal";
import { PlannerTask, WeeklyPlanner } from "@/components/WeeklyPlanner";

const starterTasks: PlannerTask[] = [
  { id: "t1", title: "Math problem set", day: "Mon", time: "9:00 AM", priority: "high", deadline: "2025-12-16T23:59:00", status: "pending" },
  { id: "t2", title: "Lab write-up", day: "Tue", time: "1:00 PM", priority: "medium", deadline: "2025-12-17T23:59:00", status: "scheduled" },
  { id: "t3", title: "History reading", day: "Wed", time: "3:00 PM", priority: "low", status: "scheduled" },
  { id: "t4", title: "Group project sync", day: "Thu", time: "10:00 AM", priority: "medium", status: "pending" },
  { id: "t5", title: "Essay drafting", day: "Fri", time: "11:00 AM", priority: "high", deadline: "2025-12-19T23:59:00", status: "scheduled" },
];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<PlannerTask[]>(starterTasks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [fullScreenCalendar, setFullScreenCalendar] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    day: "Mon" as const,
    time: "9:00 AM",
    priority: "medium" as const,
    deadline: "",
  });
  const [alternativeModal, setAlternativeModal] = useState<{
    taskId: string;
    alternatives: Array<{ day: string; time: string }>;
  } | null>(null);

  const metrics = useMemo(
    () => ({
      scheduled: tasks.filter((t) => t.status === "scheduled").length,
      pending: tasks.filter((t) => t.status === "pending").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    }),
    [tasks],
  );

  const handleApprove = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "scheduled" } : task)));
  };

  const handleReject = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "rejected" } : task)));
  };

  const handleRequestAlternative = (id: string) => {
    // Simulate AI generating 3 alternative time slots
    const alternatives = [
      { day: "Tue", time: "2:00 PM" },
      { day: "Wed", time: "10:00 AM" },
      { day: "Thu", time: "4:00 PM" },
    ];
    setAlternativeModal({ taskId: id, alternatives });
  };

  const handleSelectAlternative = (day: string, time: string) => {
    if (!alternativeModal) return;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === alternativeModal.taskId ? { ...task, day, time, status: "scheduled" as const } : task,
      ),
    );
    setAlternativeModal(null);
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    const task: PlannerTask = {
      id: `t${Date.now()}`,
      title: newTask.title,
      day: newTask.day,
      time: newTask.time,
      priority: newTask.priority,
      deadline: newTask.deadline || undefined,
      status: "pending",
    };
    setTasks((prev) => [...prev, task]);
    setNewTask({ title: "", day: "Mon", time: "9:00 AM", priority: "medium", deadline: "" });
    setShowAddForm(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute left-0 top-12 z-50 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setFullScreenCalendar(!fullScreenCalendar);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {fullScreenCalendar ? "Exit Full Calendar" : "Full Calendar View"}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(true);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Task
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dashboard</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "+ Create"}
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 pb-12 pt-24">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold text-slate-900">Weekly planner</h1>
              <p className="text-sm text-slate-600">Review AI suggestions and push them to Calendar.</p>
            </div>
          </div>
        </header>

        {fullScreenCalendar ? (
          <div className="-mx-6 -mb-12 h-[calc(100vh-12rem)]">
            <WeeklyPlanner tasks={tasks} view="month" />
          </div>
        ) : (
          <>
            {showAddForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Add New Task</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Day</label>
                <select
                  value={newTask.day}
                  onChange={(e) => setNewTask({ ...newTask, day: e.target.value as PlannerTask["day"] })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Time</label>
                <input
                  type="text"
                  value={newTask.time}
                  onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="9:00 AM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as PlannerTask["priority"] })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Deadline (optional)</label>
                <input
                  type="datetime-local"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddTask}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Add Task
              </button>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-5 text-slate-800 shadow-sm">
            <p className="text-sm text-emerald-800/80">Scheduled</p>
            <p className="mt-2 text-4xl font-semibold text-emerald-900">{metrics.scheduled}</p>
            <p className="mt-1 text-xs text-emerald-800/70">Tasks synced to calendar</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-5 text-slate-800 shadow-sm">
            <p className="text-sm text-amber-800/90">Pending</p>
            <p className="mt-2 text-4xl font-semibold text-amber-900">{metrics.pending}</p>
            <p className="mt-1 text-xs text-amber-800/70">Awaiting your approval</p>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-700 px-4 py-5 text-slate-100 shadow-sm">
            <p className="text-sm text-slate-200/80">Completed</p>
            <p className="mt-2 text-4xl font-semibold">{metrics.completed}</p>
            <p className="mt-1 text-xs text-slate-200/70">Marked done this week</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <WeeklyPlanner tasks={tasks} view="week" />
          <TaskApprovalModal
            tasks={tasks}
            onApprove={handleApprove}
            onReject={handleReject}
            onRequestAlternative={handleRequestAlternative}
          />
        </section>
          </>
        )}

        {alternativeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Alternative Time Slots</h2>
                <button
                  onClick={() => setAlternativeModal(null)}
                  className="text-slate-400 transition hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                AI has generated alternative time slots for this task. Select one to reschedule:
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {alternativeModal.alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAlternative(alt.day, alt.time)}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-emerald-400/50 hover:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {alt.day} at {alt.time}
                        </p>
                        <p className="text-xs text-slate-400">Click to apply this slot</p>
                      </div>
                      <span className="text-emerald-400">→</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setAlternativeModal(null)}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
