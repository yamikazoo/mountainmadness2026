export interface FinancialEvent {
  title: string;
  date: string;
  estimated_cost: number;
  category: string;
  source: 'calendar' | 'document';
}

export async function predictEventCosts(calendarEvents: string[]): Promise<FinancialEvent[]> {
  const response = await fetch('/api/ai/predict-costs', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calendarEvents }),
  });
  if (!response.ok) throw new Error('Failed to predict costs');

  const data = (await response.json()) as { predictions?: FinancialEvent[] };
  return data.predictions ?? [];
}

export async function parseFinancialDocument(base64Data: string, mimeType: string): Promise<FinancialEvent[]> {
  const response = await fetch('/api/ai/parse-document', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data, mimeType }),
  });
  if (!response.ok) throw new Error('Failed to parse financial document');

  const data = (await response.json()) as { parsedEvents?: FinancialEvent[] };
  return data.parsedEvents ?? [];
}

export async function generateBriefingText(events: FinancialEvent[]): Promise<string> {
  const response = await fetch('/api/ai/briefing', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });
  if (!response.ok) throw new Error('Failed to generate briefing text');

  const data = (await response.json()) as { text?: string };
  return data.text || "Good morning! You're on track with your finances today.";
}
