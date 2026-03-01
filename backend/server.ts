import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import testSupabaseRouter from "../routes/testSupabase";
import googleRouter from "../routes/google";
import { supabaseAdmin } from "../services/supabase";
import predictRouter from "../routes/predict";

dotenv.config({ path: ".env", override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Health
  app.get("/health", (_req, res) => {
    res.json({ ok: true, message: "Server is running" });
  });

  // API routes
  app.use("/api", testSupabaseRouter);
  app.use("/api", googleRouter);
  app.use("/api", predictRouter);

  // Events from Supabase
  app.get("/api/events", async (_req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json(data);
    } catch (error) {
      console.error("GET /api/events error:", error);
      return res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const {
        title,
        description,
        location,
        start_time,
        end_time,
        estimated_cost,
        category,
        source,
      } = req.body;

      const { data, error } = await supabaseAdmin
        .from("events")
        .insert([
          {
            title,
            description: description || null,
            location: location || null,
            start_time,
            end_time: end_time || null,
            estimated_cost: estimated_cost ?? 0,
            category: category || "Uncategorized",
            source: source || "calendar",
          },
        ])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json(data);
    } catch (error) {
      console.error("POST /api/events error:", error);
      return res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Social data still from local SQLite
  // Mock social data until Supabase schema is ready
  app.get("/api/social", (_req, res) => {
    const circles = [{ id: 1, name: "Grad Trip Fund", goal_amount: 5000.00, current_savings: 1250.00 }];
    const leaderboard = [
      { id: 1, user_name: "Alex Chen", savings_score: 1250.00, predicted_spending: 2400.00 },
      { id: 2, user_name: "Sarah J.", savings_score: 980.00, predicted_spending: 3100.00 },
      { id: 3, user_name: "You", savings_score: 850.00, predicted_spending: 2100.00 },
      { id: 4, user_name: "Marcus T.", savings_score: 420.00, predicted_spending: 4500.00 }
    ];

    res.json({ circles, leaderboard });
  });

  // ElevenLabs TTS
  app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    if (!apiKey) {
      return res
        .status(400)
        .json({ error: "ElevenLabs API key not configured" });
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs API full error:", errorText);
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      res.set("Content-Type", "audio/mpeg");
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();