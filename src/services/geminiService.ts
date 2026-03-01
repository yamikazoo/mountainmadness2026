import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface FinancialEvent {
  title: string;
  date: string;
  estimated_cost: number;
  category: string;
  source: 'calendar' | 'document';
}

export async function predictEventCosts(calendarEvents: string[]): Promise<FinancialEvent[]> {
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `Analyze these calendar events and predict the financial impact for each. 
  Return a JSON array of objects with: title, date (YYYY-MM-DD), estimated_cost (number), category, and source ('calendar').
  
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

export async function parseFinancialDocument(base64Data: string, mimeType: string): Promise<FinancialEvent[]> {
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `This is a financial document (receipt, bill, or lease). 
  Extract all upcoming payment obligations, due dates, and amounts.
  Return a JSON array of objects with: title, date (YYYY-MM-DD), estimated_cost (number), category, and source ('document').`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
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

export async function generateBriefingText(events: FinancialEvent[]): Promise<string> {
  if (!ai) throw new Error("Gemini API key not configured");

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
