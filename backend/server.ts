import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import testSupabaseRouter from "./routes/testSupabase";
import googleRouter from "./routes/google";
import { supabaseAdmin } from "./services/supabase";
import predictRouter from "./routes/predict";

dotenv.config({ path: ".env", override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("finsync.db");

// Initialize SQLite Database
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    date TEXT,
    estimated_cost REAL,
    category TEXT,
    source TEXT
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    upload_date TEXT,
    content_summary TEXT,
    total_amount REAL
  );

  CREATE TABLE IF NOT EXISTS social_circles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    goal_amount REAL,
    current_savings REAL
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    savings_score INTEGER
  );
`);

// Seed SQLite data if empty
const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
if (eventCount.count === 0) {
  db.prepare(
    "INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)"
  ).run("Whistler Trip", "2026-03-15", 450.0, "Travel", "calendar");

  db.prepare(
    "INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)"
  ).run("Rent Payment", "2026-03-01", 1200.0, "Housing", "document");
}

const circleCount = db.prepare("SELECT COUNT(*) as count FROM social_circles").get() as { count: number };
if (circleCount.count === 0) {
  db.prepare(
    "INSERT INTO social_circles (name, goal_amount, current_savings) VALUES (?, ?, ?)"
  ).run("Grad Trip Fund", 5000.0, 1250.0);
}

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
  app.get("/api/social", (_req, res) => {
    const circles = db.prepare("SELECT * FROM social_circles").all();
    const leaderboard = db
      .prepare("SELECT * FROM leaderboard ORDER BY savings_score DESC")
      .all();

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
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("ElevenLabs API error");
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