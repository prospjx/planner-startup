import { CalendarEvent } from "@/lib/googleCalendar";

export type Task = {
  id: string;
  title: string;
  durationMinutes: number;
  deadline?: string; // ISO date string
  priority: "low" | "medium" | "high";
};

export type ScheduleRequest = {
  tasks: Task[];
  weekStart: string; // ISO date string
  existingEvents?: CalendarEvent[]; // Current calendar availability
};

type TimeSlot = {
  taskId: string;
  start: Date;
  end: Date;
  confidence: number; // 0-1, how confident we are in this slot
};

// Priority weights for scheduling
const PRIORITY_WEIGHTS = { high: 3, medium: 2, low: 1 };

// Preferred time blocks (9 AM - 5 PM for focus work)
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;

/**
 * Hybrid AI scheduling logic
 * 1. Use heuristics for simple scheduling (deadline-aware, priority-based)
 * 2. Fall back to OpenAI for complex conflicts or optimization
 */
export async function planSchedule({
  tasks,
  weekStart,
  existingEvents = [],
}: ScheduleRequest): Promise<CalendarEvent[]> {
  // Step 1: Try heuristic-based scheduling
  const heuristicSlots = scheduleWithHeuristics(tasks, weekStart, existingEvents);
  
  // Check if heuristics produced high-confidence schedule
  const avgConfidence = heuristicSlots.reduce((sum, slot) => sum + slot.confidence, 0) / heuristicSlots.length;
  
  if (avgConfidence >= 0.8 || !process.env.OPENAI_API_KEY) {
    // High confidence or no API key - use heuristic results
    return heuristicSlots.map(slotToEvent);
  }
  
  // Step 2: Low confidence - enhance with OpenAI
  try {
    return await scheduleWithOpenAI(tasks, weekStart, existingEvents, heuristicSlots);
  } catch (error) {
    console.warn("OpenAI scheduling failed, falling back to heuristics:", error);
    return heuristicSlots.map(slotToEvent);
  }
}

/**
 * Heuristic-based scheduling algorithm
 * - Sort by deadline urgency and priority
 * - Assign to earliest available slots
 * - Avoid conflicts with existing events
 */
function scheduleWithHeuristics(
  tasks: Task[],
  weekStart: string,
  existingEvents: CalendarEvent[]
): TimeSlot[] {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  
  // Sort tasks: deadline first, then priority
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.deadline && b.deadline) {
      const deadlineComp = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (deadlineComp !== 0) return deadlineComp;
    } else if (a.deadline) return -1;
    else if (b.deadline) return 1;
    
    return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
  });
  
  const slots: TimeSlot[] = [];
  const occupiedSlots = existingEvents.map(e => ({
    start: new Date(e.start),
    end: new Date(e.end),
  }));
  
  for (const task of sortedTasks) {
    const slot = findNextAvailableSlot(
      task,
      startDate,
      endDate,
      occupiedSlots
    );
    
    if (slot) {
      slots.push(slot);
      occupiedSlots.push({ start: slot.start, end: slot.end });
    } else {
      // No slot found - assign with low confidence
      const fallbackStart = new Date(startDate);
      fallbackStart.setHours(WORK_END_HOUR, 0, 0, 0);
      const fallbackEnd = new Date(fallbackStart.getTime() + task.durationMinutes * 60_000);
      slots.push({
        taskId: task.id,
        start: fallbackStart,
        end: fallbackEnd,
        confidence: 0.3,
      });
    }
  }
  
  return slots;
}

/**
 * Find the next available time slot for a task
 */
function findNextAvailableSlot(
  task: Task,
  weekStart: Date,
  weekEnd: Date,
  occupied: Array<{ start: Date; end: Date }>
): TimeSlot | null {
  const taskDuration = task.durationMinutes * 60_000; // ms
  const deadline = task.deadline ? new Date(task.deadline) : weekEnd;
  
  // Try each day in the week
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + dayOffset);
    
    // Try time slots from WORK_START_HOUR to WORK_END_HOUR
    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
      const slotStart = new Date(currentDay);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + taskDuration);
      
      // Skip if past deadline
      if (slotEnd > deadline) continue;
      
      // Check for conflicts
      const hasConflict = occupied.some(
        occ => slotStart < occ.end && slotEnd > occ.start
      );
      
      if (!hasConflict && slotEnd.getHours() <= WORK_END_HOUR) {
        // Calculate confidence based on priority and deadline proximity
        const deadlineProximity = deadline.getTime() - slotEnd.getTime();
        const daysUntilDeadline = deadlineProximity / (24 * 60 * 60 * 1000);
        const urgencyBonus = daysUntilDeadline > 3 ? 0.2 : 0.4;
        const priorityBonus = PRIORITY_WEIGHTS[task.priority] / 3;
        const confidence = Math.min(0.7 + urgencyBonus + priorityBonus * 0.2, 1.0);
        
        return {
          taskId: task.id,
          start: slotStart,
          end: slotEnd,
          confidence,
        };
      }
    }
  }
  
  return null;
}

/**
 * OpenAI-enhanced scheduling for complex cases
 * Uses GPT to optimize schedule based on task context and constraints
 */
async function scheduleWithOpenAI(
  tasks: Task[],
  weekStart: string,
  existingEvents: CalendarEvent[],
  heuristicSlots: TimeSlot[]
): Promise<CalendarEvent[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  
  // Prepare prompt with context
  const prompt = `You are a scheduling assistant. Given these tasks and constraints, optimize the schedule.

Tasks:
${tasks.map(t => `- ${t.title} (${t.durationMinutes}min, priority: ${t.priority}${t.deadline ? `, deadline: ${t.deadline}` : ''})`).join('\n')}

Week starts: ${weekStart}
Existing events: ${existingEvents.length} events
Current heuristic schedule confidence: ${(heuristicSlots.reduce((s, sl) => s + sl.confidence, 0) / heuristicSlots.length * 100).toFixed(0)}%

Suggest optimized time slots in JSON format:
[{"taskId": "...", "start": "ISO date", "end": "ISO date"}]`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful scheduling assistant. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  const aiSlots = JSON.parse(data.choices[0].message.content);
  
  // Convert AI suggestions to events
  return aiSlots.map((slot: { taskId: string; start: string; end: string }) => {
    const task = tasks.find(t => t.id === slot.taskId);
    return {
      id: slot.taskId,
      title: task?.title || "Unknown Task",
      start: slot.start,
      end: slot.end,
      status: "tentative" as const,
    };
  });
}

/**
 * Convert TimeSlot to CalendarEvent
 */
function slotToEvent(slot: TimeSlot): CalendarEvent {
  return {
    id: slot.taskId,
    title: slot.taskId, // Will be enriched by caller
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    status: "tentative",
  };
}
