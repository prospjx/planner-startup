import { CalendarEvent } from "@/lib/googleCalendar";

export type ScheduleRequest = {
  tasks: Array<{ id: string; title: string; durationMinutes: number }>;
  weekStart: string; // ISO date string
};

export async function planSchedule({ tasks, weekStart }: ScheduleRequest): Promise<CalendarEvent[]> {
  // Stub that assigns tasks sequentially across the week for demo purposes.
  const startDate = new Date(weekStart);
  return tasks.map((task, index) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    const start = new Date(day.setHours(9, 0, 0, 0));
    const end = new Date(start.getTime() + task.durationMinutes * 60_000);
    return {
      id: task.id,
      title: task.title,
      start: start.toISOString(),
      end: end.toISOString(),
      status: "tentative",
    } satisfies CalendarEvent;
  });
}
