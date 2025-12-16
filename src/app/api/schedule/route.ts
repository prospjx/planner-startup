import { NextResponse } from "next/server";
import { planSchedule } from "@/lib/aiScheduler";
import { upsertCalendarEvents } from "@/lib/googleCalendar";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    const weekStart = body?.weekStart ?? new Date().toISOString();

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "Provide tasks as an array of { id, title, durationMinutes }." },
        { status: 400 },
      );
    }

    const events = await planSchedule({ tasks, weekStart });
    const syncResult = await upsertCalendarEvents(events);

    return NextResponse.json({ ok: true, events, syncResult });
  } catch (error) {
    console.error("Schedule error", error);
    return NextResponse.json({ ok: false, error: "Scheduling failed" }, { status: 500 });
  }
}
