import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("finsync.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    date TEXT,
    estimated_cost REAL,
    category TEXT,
    source TEXT -- 'calendar' or 'document'
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
    savings_score REAL,
    predicted_spending REAL
  );
`);

// Reset leaderboard for schema change
db.exec('DROP TABLE IF EXISTS leaderboard');
db.exec(`
  CREATE TABLE leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    savings_score REAL,
    predicted_spending REAL
  );
`);

// Seed data if empty
const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
if (eventCount.count === 0) {
  db.prepare("INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)").run(
    "Whistler Trip", "2026-03-15", 450.00, "Travel", "calendar"
  );
  db.prepare("INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)").run(
    "Rent Payment", "2026-03-01", 1200.00, "Housing", "document"
  );
}

const circleCount = db.prepare("SELECT COUNT(*) as count FROM social_circles").get() as { count: number };
if (circleCount.count === 0) {
  db.prepare("INSERT INTO social_circles (name, goal_amount, current_savings) VALUES (?, ?, ?)").run(
    "Grad Trip Fund", 5000.00, 1250.00
  );
}

// Ensure leaderboard has data
const leaderCount = db.prepare("SELECT COUNT(*) as count FROM leaderboard").get() as { count: number };
if (leaderCount.count === 0) {
  const insert = db.prepare("INSERT INTO leaderboard (user_name, savings_score, predicted_spending) VALUES (?, ?, ?)");
  insert.run("Alex Chen", 1250.00, 2400.00);
  insert.run("Sarah J.", 980.00, 3100.00);
  insert.run("You", 850.00, 2100.00);
  insert.run("Marcus T.", 420.00, 4500.00);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/events", (req, res) => {
    const events = db.prepare("SELECT * FROM events ORDER BY date ASC").all();
    res.json(events);
  });

  app.post("/api/events", (req, res) => {
    const { title, date, estimated_cost, category, source } = req.body;
    const info = db.prepare("INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)").run(
      title, date, estimated_cost, category, source
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/social", (req, res) => {
    const circles = db.prepare("SELECT * FROM social_circles").all();
    const leaderboard = db.prepare("SELECT * FROM leaderboard ORDER BY savings_score DESC").all();
    res.json({ circles, leaderboard });
  });

  app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    if (!apiKey) {
      return res.status(400).json({ error: "ElevenLabs API key not configured" });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
