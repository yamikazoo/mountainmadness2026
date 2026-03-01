import { GoogleGenAI, Type } from "@google/genai";

export interface FinancialEvent {
  title: string;
  date: string;
  estimated_cost: number;
  category: string;
  source: "calendar" | "document";
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

export async function predictEventCostsWithGemini(
  calendarEvents: string[]
): Promise<FinancialEvent[]> {
  const ai = getGeminiClient();
  const prompt = `Analyze these calendar events and predict the financial impact for each.
Return a JSON array with: title, date (YYYY-MM-DD), estimated_cost (number), category, source ('calendar').

Events:
${calendarEvents.join("\n")}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            estimated_cost: { type: Type.NUMBER },
            category: { type: Type.STRING },
            source: { type: Type.STRING },
          },
          required: ["title", "date", "estimated_cost", "category", "source"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
}

export async function parseFinancialDocumentWithGemini(
  base64Data: string,
  mimeType: string
): Promise<FinancialEvent[]> {
  const ai = getGeminiClient();
  const prompt = `This is a financial document (receipt, bill, or lease).
Extract upcoming payment obligations, due dates, and amounts.
Return a JSON array with: title, date (YYYY-MM-DD), estimated_cost (number), category, source ('document').`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            estimated_cost: { type: Type.NUMBER },
            category: { type: Type.STRING },
            source: { type: Type.STRING },
          },
          required: ["title", "date", "estimated_cost", "category", "source"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
}

export async function generateBriefingTextWithGemini(
  events: FinancialEvent[]
): Promise<string> {
  const ai = getGeminiClient();
  const prompt = `Generate a short, energetic, and helpful 30-second morning financial briefing based on these upcoming events.
Mention specific goals and encourage the user. Keep it under 100 words.

Events:
${JSON.stringify(events)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Good morning! You're on track with your finances today.";
}
