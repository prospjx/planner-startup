export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: "confirmed" | "tentative";
};

// Placeholder to simulate pushing events to Google Calendar.
export async function upsertCalendarEvents(events: CalendarEvent[]) {
  // In production, exchange OAuth tokens and call Google Calendar API.
  return {
    synced: events.length,
    ids: events.map((event) => event.id),
  };
}
