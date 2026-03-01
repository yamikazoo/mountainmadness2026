export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
}

interface GoogleCalendarApiEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
}

const GOOGLE_CALENDAR_API_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function toISODate(daysFromNow: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function getMockCalendarEvents(): CalendarEvent[] {
  return [
    {
      id: "mock-team-lunch",
      summary: "Team Lunch",
      start: toISODate(1, 12, 0),
      end: toISODate(1, 13, 0),
      location: "Downtown Food Court",
    },
    {
      id: "mock-study-group-coffee",
      summary: "Study Group at Coffee Shop",
      start: toISODate(2, 15, 0),
      end: toISODate(2, 17, 0),
      location: "BrewLab Cafe",
    },
    {
      id: "mock-back-to-back-meetings",
      summary: "Back-to-back Meetings",
      start: toISODate(3, 9, 0),
      end: toISODate(3, 12, 0),
      location: "Virtual",
    },
  ];
}

function mapGoogleEventToCalendarEvent(
  event: GoogleCalendarApiEvent,
  index: number
): CalendarEvent | null {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;

  if (!start || !end) {
    return null;
  }

  return {
    id: event.id ?? `event-${index}`,
    summary: event.summary ?? "Untitled Event",
    start,
    end,
    location: event.location,
  };
}

export async function fetchCalendarEvents(
  accessToken?: string
): Promise<CalendarEvent[]> {
  if (!accessToken) {
    return getMockCalendarEvents();
  }

  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: inSevenDays.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_URL}?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("Google Calendar API request failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return getMockCalendarEvents();
    }

    const data = (await response.json()) as {
      items?: GoogleCalendarApiEvent[];
    };

    const events = (data.items ?? [])
      .map(mapGoogleEventToCalendarEvent)
      .filter((event): event is CalendarEvent => event !== null);

    return events;
  } catch (error) {
    console.error("Unexpected Google Calendar API error", error);
    return getMockCalendarEvents();
  }
}
