export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  source: "google-calendar";
}

interface GoogleCalendarApiEvent {
  id?: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarApiEvent[];
}

export interface CalendarEventsResult {
  events: CalendarEvent[];
  isFallback: boolean;
  fallbackReason?: string;
}

const CALENDAR_URL =
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
      title: "Team Lunch",
      start: toISODate(1, 12, 0),
      end: toISODate(1, 13, 0),
      location: "Downtown Food Court",
      source: "google-calendar",
    },
    {
      id: "mock-study-group-coffee",
      title: "Study Group at Coffee Shop",
      start: toISODate(2, 15, 0),
      end: toISODate(2, 17, 0),
      location: "BrewLab Cafe",
      source: "google-calendar",
    },
    {
      id: "mock-back-to-back-meetings",
      title: "Back-to-back Meetings",
      start: toISODate(3, 9, 0),
      end: toISODate(3, 12, 0),
      location: "Virtual",
      source: "google-calendar",
    },
  ];
}

function mapGoogleEvent(event: GoogleCalendarApiEvent, index: number): CalendarEvent | null {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;

  if (!start || !end) {
    return null;
  }

  return {
    id: event.id ?? `google-event-${index}`,
    title: event.summary ?? "Untitled Event",
    start,
    end,
    location: event.location,
    source: "google-calendar",
  };
}

export async function fetchCalendarEventsForNext7Days(
  accessToken?: string
): Promise<CalendarEventsResult> {
  if (!accessToken) {
    return {
      events: getMockCalendarEvents(),
      isFallback: true,
      fallbackReason: "missing_access_token",
    };
  }

  const now = new Date();
  const max = new Date(now);
  max.setDate(max.getDate() + 7);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  try {
    const response = await fetch(`${CALENDAR_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const reason = response.status === 429 ? "rate_limited" : `google_api_${response.status}`;
      return {
        events: getMockCalendarEvents(),
        isFallback: true,
        fallbackReason: reason,
      };
    }

    const data = (await response.json()) as GoogleCalendarListResponse;
    const events = (data.items ?? [])
      .map(mapGoogleEvent)
      .filter((event): event is CalendarEvent => event !== null);

    return {
      events,
      isFallback: false,
    };
  } catch (error) {
    console.error("Calendar fetch failed", error);
    return {
      events: getMockCalendarEvents(),
      isFallback: true,
      fallbackReason: "network_or_unknown_error",
    };
  }
}
