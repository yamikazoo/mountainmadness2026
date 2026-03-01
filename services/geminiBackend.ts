import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env", override: true });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in .env");
}

const ai = new GoogleGenAI({ apiKey });

export type EventPrediction = {
  estimated_cost: number;
  category: string;
  prediction_reasoning: string;
  prediction_confidence: number;
};

export async function predictSingleEventCost(input: {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time?: string | null;
}): Promise<EventPrediction> {
  const prompt = `
You are a finance forecasting assistant for a budgeting app.

Your job is to estimate the likely out-of-pocket spending caused by this calendar event.

Rules:
- Predict only the user's likely spending related to this event.
- If the event probably has no spending, return 0.
- Be practical and conservative.
- Use the event title, description, location, and timing.
- Category should be a short label like: Dining, Travel, Housing, Groceries, Shopping, Entertainment, Education, Health, Bills, Transport, Gift, Personal, Work, Fitness, Uncategorized.
- prediction_confidence must be between 0 and 1.
- prediction_reasoning should be 1 short sentence.

Event:
${JSON.stringify(input, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          estimated_cost: { type: Type.NUMBER },
          category: { type: Type.STRING },
          prediction_reasoning: { type: Type.STRING },
          prediction_confidence: { type: Type.NUMBER },
        },
        required: [
          "estimated_cost",
          "category",
          "prediction_reasoning",
          "prediction_confidence",
        ],
      },
    },
  });

  const parsed = JSON.parse(response.text || "{}");

  return {
    estimated_cost: Number(parsed.estimated_cost ?? 0),
    category: String(parsed.category ?? "Uncategorized"),
    prediction_reasoning: String(
      parsed.prediction_reasoning ?? "No reasoning provided."
    ),
    prediction_confidence: Math.max(
      0,
      Math.min(1, Number(parsed.prediction_confidence ?? 0.5))
    ),
  };
}