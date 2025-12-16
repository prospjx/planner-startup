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
  
  if (avgConfidence >= 0.8 || !process.env.GEMINI_API_KEY) {
    // High confidence or no API key - use heuristic results
    return heuristicSlots.map(slotToEvent);
  }
  
  // Step 2: Low confidence - enhance with Gemini AI
  try {
    return await scheduleWithGemini(tasks, weekStart, existingEvents, heuristicSlots);
  } catch (error) {
    console.warn("Gemini scheduling failed, falling back to heuristics:", error);
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
 * Gemini AI-enhanced scheduling for complex cases
 * Uses Google's Gemini to optimize schedule based on task context and constraints
 */
async function scheduleWithGemini(
  tasks: Task[],
  weekStart: string,
  existingEvents: CalendarEvent[],
  heuristicSlots: TimeSlot[]
): Promise<CalendarEvent[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");
  
  // Prepare prompt with context
  const prompt = `You are a scheduling assistant. Given these tasks and constraints, optimize the schedule.

Tasks:
${tasks.map(t => `- ${t.title} (${t.durationMinutes}min, priority: ${t.priority}${t.deadline ? `, deadline: ${t.deadline}` : ''})`).join('\n')}

Week starts: ${weekStart}
Existing events: ${existingEvents.length} events
Current heuristic schedule confidence: ${(heuristicSlots.reduce((s, sl) => s + sl.confidence, 0) / heuristicSlots.length * 100).toFixed(0)}%

Suggest optimized time slots in JSON format:
[{"taskId": "...", "start": "ISO date", "end": "ISO date"}]`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  const textResponse = data.candidates[0].content.parts[0].text;
  
  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || textResponse.match(/\[[\s\S]*\]/);
  const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
  const aiSlots = JSON.parse(jsonText);
  
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

/**
 * Suggest a time slot for a single task
 * Finds the first available 1-2 hour slot before the deadline
 * 
 * @param task - Task to schedule (must have durationMinutes, optional deadline)
 * @param calendar - Array of existing calendar events
 * @returns Suggested time slot or null if none found
 */
export function suggestTimeSlot(
  task: { durationMinutes: number; deadline?: string },
  calendar: CalendarEvent[]
): { start: Date; end: Date } | null {
  const now = new Date();
  const deadline = task.deadline ? new Date(task.deadline) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days default
  
  // Convert calendar events to occupied slots
  const occupied = calendar.map(e => ({
    start: new Date(e.start),
    end: new Date(e.end),
  }));
  
  // Try to find a slot between now and deadline
  const searchEnd = new Date(Math.min(deadline.getTime(), now.getTime() + 14 * 24 * 60 * 60 * 1000));
  let currentDay = new Date(now);
  currentDay.setHours(WORK_START_HOUR, 0, 0, 0);
  
  // If current time is past work hours, start tomorrow
  if (now.getHours() >= WORK_END_HOUR) {
    currentDay.setDate(currentDay.getDate() + 1);
  } else if (now.getHours() >= WORK_START_HOUR) {
    currentDay = new Date(now);
    currentDay.setMinutes(Math.ceil(now.getMinutes() / 30) * 30); // Round to next 30 min
  }
  
  const taskDuration = task.durationMinutes * 60_000; // ms
  
  // Search for available slot
  while (currentDay < searchEnd) {
    // Skip weekends (optional - remove if you want weekend scheduling)
    const dayOfWeek = currentDay.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDay.setDate(currentDay.getDate() + 1);
      currentDay.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }
    
    // Try each 30-minute increment during work hours
    for (let hour = currentDay.getHours(); hour < WORK_END_HOUR; hour++) {
      for (let minute = (hour === currentDay.getHours() ? currentDay.getMinutes() : 0); minute < 60; minute += 30) {
        const slotStart = new Date(currentDay);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + taskDuration);
        
        // Skip if slot extends past work hours or deadline
        if (slotEnd.getHours() > WORK_END_HOUR || slotEnd > deadline) {
          continue;
        }
        
        // Check for conflicts
        const hasConflict = occupied.some(
          occ => slotStart < occ.end && slotEnd > occ.start
        );
        
        if (!hasConflict) {
          return { start: slotStart, end: slotEnd };
        }
      }
    }
    
    // Move to next day
    currentDay.setDate(currentDay.getDate() + 1);
    currentDay.setHours(WORK_START_HOUR, 0, 0, 0);
  }
  
  return null; // No available slot found
}
