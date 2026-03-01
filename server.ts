import express, { NextFunction, Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import { fetchCalendarEventsForNext7Days } from "./server/googleCalendar";
import {
  FinancialEvent,
  generateBriefingTextWithGemini,
  parseFinancialDocumentWithGemini,
  predictEventCostsWithGemini,
} from "./server/gemini";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT ?? "3000");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/auth/google/callback";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "change-me-in-env";
const SESSION_COOKIE_NAME = "nomi_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_BUFFER_MS = 60 * 1000;
const DEBUG_ENDPOINT = "http://127.0.0.1:7685/ingest/b300ec8c-ca08-4387-b4f8-d15610ac0220";
const DEBUG_SESSION_ID = "87e23f";

async function debugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  await fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": DEBUG_SESSION_ID },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      ...payload,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

interface SessionUser {
  email?: string;
  name?: string;
  picture?: string;
}

interface SessionData {
  id: string;
  user: SessionUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  createdAt: number;
}

const sessions = new Map<string, SessionData>();
const oauthStateStore = new Map<string, number>();
const dbPath = path.resolve(process.cwd(), "finsync.db");

// #region agent log
await debugLog({
  runId: "initial-repro",
  hypothesisId: "H2",
  location: "server.ts:dbPath",
  message: "Resolved database path and cwd",
  data: { dbPath, cwd: process.cwd() },
});
// #endregion

const dbFileExists = fs.existsSync(dbPath);
const dbFileStats = dbFileExists ? fs.statSync(dbPath) : null;
const dbFileMagicHex = dbFileExists
  ? fs.readFileSync(dbPath).subarray(0, 16).toString("hex")
  : "missing";
const SQLITE_HEADER_HEX = "53514c69746520666f726d6174203300";

// #region agent log
await debugLog({
  runId: "initial-repro",
  hypothesisId: "H1",
  location: "server.ts:dbFileProbe",
  message: "Database file probe before opening sqlite",
  data: {
    exists: dbFileExists,
    size: dbFileStats?.size ?? null,
    magicHexPrefix16: dbFileMagicHex,
  },
});
// #endregion

if (dbFileExists && (dbFileStats?.size ?? 0) > 0 && dbFileMagicHex !== SQLITE_HEADER_HEX) {
  const backupPath = `${dbPath}.corrupt-${Date.now()}`;
  fs.renameSync(dbPath, backupPath);
  // #region agent log
  await debugLog({
    runId: "post-fix",
    hypothesisId: "H5",
    location: "server.ts:dbRepair",
    message: "Detected non-sqlite DB file and moved to backup path",
    data: { originalPath: dbPath, backupPath, previousMagicHex: dbFileMagicHex },
  });
  // #endregion
}

const db = new Database(dbPath);

// #region agent log
await debugLog({
  runId: "initial-repro",
  hypothesisId: "H3",
  location: "server.ts:dbOpen",
  message: "Opened sqlite database handle",
  data: { dbPath },
});
// #endregion

try {
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
  // #region agent log
  await debugLog({
    runId: "initial-repro",
    hypothesisId: "H4",
    location: "server.ts:dbExecSuccess",
    message: "Schema initialization succeeded",
    data: { dbPath },
  });
  // #endregion
} catch (error) {
  // #region agent log
  await debugLog({
    runId: "initial-repro",
    hypothesisId: "H4",
    location: "server.ts:dbExecError",
    message: "Schema initialization failed",
    data: {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
      dbPath,
    },
  });
  // #endregion
  throw error;
}

const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
if (eventCount.count === 0) {
  db.prepare(
    "INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)"
  ).run("Whistler Trip", "2026-03-15", 450.0, "Travel", "calendar");
  db.prepare(
    "INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)"
  ).run("Rent Payment", "2026-03-01", 1200.0, "Housing", "document");
}

const circleCount = db.prepare("SELECT COUNT(*) as count FROM social_circles").get() as {
  count: number;
};
if (circleCount.count === 0) {
  db.prepare("INSERT INTO social_circles (name, goal_amount, current_savings) VALUES (?, ?, ?)").run(
    "Grad Trip Fund",
    5000.0,
    1250.0
  );
}

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey || rawValue.length === 0) {
      return acc;
    }
    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
}

function signSessionId(sessionId: string) {
  return createHmac("sha256", SESSION_SECRET).update(sessionId).digest("hex");
}

function buildCookieValue(sessionId: string) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

function readSessionId(req: Request) {
  const cookie = parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME];
  if (!cookie) {
    return undefined;
  }

  const [sessionId, signature] = cookie.split(".");
  if (!sessionId || !signature) {
    return undefined;
  }

  if (signSessionId(sessionId) !== signature) {
    return undefined;
  }

  return sessionId;
}

function setSessionCookie(res: Response, sessionId: string) {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${buildCookieValue(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSec}; ${
      process.env.NODE_ENV === "production" ? "Secure;" : ""
    }`
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; ${
      process.env.NODE_ENV === "production" ? "Secure;" : ""
    }`
  );
}

function normalizeEventPayload(payload: unknown): FinancialEvent | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as Partial<FinancialEvent>;
  if (
    typeof value.title !== "string" ||
    typeof value.date !== "string" ||
    typeof value.estimated_cost !== "number" ||
    Number.isNaN(value.estimated_cost) ||
    typeof value.category !== "string" ||
    (value.source !== "calendar" && value.source !== "document")
  ) {
    return null;
  }

  return {
    title: value.title,
    date: value.date,
    estimated_cost: value.estimated_cost,
    category: value.category,
    source: value.source,
  };
}

async function refreshGoogleAccessToken(session: SessionData) {
  if (!session.refreshToken || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return session;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh access token (${response.status})`);
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  const updatedSession: SessionData = {
    ...session,
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };
  sessions.set(session.id, updatedSession);
  return updatedSession;
}

async function getValidSession(req: Request) {
  const sessionId = readSessionId(req);
  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  if (Date.now() > session.createdAt + SESSION_TTL_MS) {
    sessions.delete(session.id);
    return null;
  }

  if (Date.now() >= session.expiresAt - REFRESH_BUFFER_MS) {
    try {
      return await refreshGoogleAccessToken(session);
    } catch (error) {
      console.error("Session refresh failed", error);
      sessions.delete(session.id);
      return null;
    }
  }

  return session;
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await getValidSession(req);
  if (!session) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Sign in with Google to access this endpoint.",
    });
  }

  res.locals.session = session;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  app.get("/auth/google", async (req, res) => {
    // #region agent log
    await debugLog({
      runId: "oauth-mismatch-repro",
      hypothesisId: "H6",
      location: "server.ts:/auth/google:entry",
      message: "OAuth entry and runtime redirect context",
      data: {
        configuredRedirectUri: GOOGLE_REDIRECT_URI,
        requestHost: req.headers.host ?? "missing",
        requestProtoHeader: req.headers["x-forwarded-proto"] ?? "missing",
        expectedLocalRedirect: `${req.protocol}://${req.headers.host ?? "localhost:3000"}/auth/google/callback`,
      },
    });
    // #endregion

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      // #region agent log
      await debugLog({
        runId: "oauth-mismatch-repro",
        hypothesisId: "H7",
        location: "server.ts:/auth/google:missingCredentials",
        message: "OAuth credentials missing",
        data: {
          hasClientId: Boolean(GOOGLE_CLIENT_ID),
          hasClientSecret: Boolean(GOOGLE_CLIENT_SECRET),
        },
      });
      // #endregion
      return res.status(500).send("Google OAuth credentials are not configured.");
    }

    const state = randomUUID();
    oauthStateStore.set(state, Date.now());

    const authParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.readonly",
      ].join(" "),
      state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
    // #region agent log
    await debugLog({
      runId: "oauth-mismatch-repro",
      hypothesisId: "H8",
      location: "server.ts:/auth/google:redirect",
      message: "Redirecting to Google OAuth URL",
      data: {
        redirectUriInQuery: authParams.get("redirect_uri"),
        authUrlPrefix: googleAuthUrl.slice(0, 160),
      },
    });
    // #endregion

    res.redirect(googleAuthUrl);
  });

  app.get("/auth/google/callback", async (req, res) => {
    // #region agent log
    await debugLog({
      runId: "oauth-mismatch-repro",
      hypothesisId: "H9",
      location: "server.ts:/auth/google/callback:entry",
      message: "Callback route hit",
      data: {
        hasCode: typeof req.query.code === "string",
        hasError: typeof req.query.error === "string",
        errorValue: typeof req.query.error === "string" ? req.query.error : null,
      },
    });
    // #endregion

    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const stateCreatedAt = oauthStateStore.get(state);

    if (!code || !state || !stateCreatedAt || Date.now() - stateCreatedAt > 10 * 60 * 1000) {
      return res.status(400).send("Invalid or expired OAuth state.");
    }

    oauthStateStore.delete(state);

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenResponse.ok) {
        return res.status(400).send("Failed to exchange Google OAuth code.");
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = userResponse.ok
        ? ((await userResponse.json()) as SessionUser)
        : ({} as SessionUser);

      const sessionId = randomUUID();
      sessions.set(sessionId, {
        id: sessionId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        user: userData,
        createdAt: Date.now(),
      });

      setSessionCookie(res, sessionId);
      res.redirect("/");
    } catch (error) {
      console.error("Google OAuth callback failed", error);
      res.status(500).send("Google OAuth failed. Check server logs.");
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    const session = await getValidSession(req);
    if (!session) {
      return res.json({
        authenticated: false,
      });
    }

    res.json({
      authenticated: true,
      user: session.user,
    });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const session = await getValidSession(req);
    if (session) {
      sessions.delete(session.id);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/calendar/events", requireAuth, async (req, res) => {
    const session = res.locals.session as SessionData;
    const result = await fetchCalendarEventsForNext7Days(session.accessToken);
    res.json(result);
  });

  app.get("/api/events", requireAuth, (req, res) => {
    const events = db.prepare("SELECT * FROM events ORDER BY date ASC").all();
    res.json(events);
  });

  app.post("/api/events", requireAuth, (req, res) => {
    const event = normalizeEventPayload(req.body);
    if (!event) {
      return res.status(400).json({
        error: "invalid_event_payload",
        message:
          "Expected { title, date, estimated_cost, category, source:'calendar'|'document' }.",
      });
    }

    const info = db
      .prepare("INSERT INTO events (title, date, estimated_cost, category, source) VALUES (?, ?, ?, ?, ?)")
      .run(event.title, event.date, event.estimated_cost, event.category, event.source);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/social", requireAuth, (_req, res) => {
    const circles = db.prepare("SELECT * FROM social_circles").all();
    const leaderboard = db.prepare("SELECT * FROM leaderboard ORDER BY savings_score DESC").all();
    res.json({ circles, leaderboard });
  });

  app.post("/api/ai/predict-costs", requireAuth, async (req, res) => {
    const calendarEvents = Array.isArray(req.body?.calendarEvents) ? req.body.calendarEvents : [];
    if (!calendarEvents.every((item: unknown) => typeof item === "string")) {
      return res.status(400).json({ error: "calendarEvents must be a string array." });
    }

    try {
      const predictions = await predictEventCostsWithGemini(calendarEvents);
      res.json({ predictions });
    } catch (error) {
      console.error("Predict costs error", error);
      res.status(500).json({ error: "Failed to predict event costs." });
    }
  });

  app.post("/api/ai/parse-document", requireAuth, async (req, res) => {
    const base64Data = typeof req.body?.base64Data === "string" ? req.body.base64Data : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "";
    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: "base64Data and mimeType are required." });
    }

    try {
      const parsedEvents = await parseFinancialDocumentWithGemini(base64Data, mimeType);
      res.json({ parsedEvents });
    } catch (error) {
      console.error("Parse document error", error);
      res.status(500).json({ error: "Failed to parse financial document." });
    }
  });

  app.post("/api/ai/briefing", requireAuth, async (req, res) => {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    try {
      const text = await generateBriefingTextWithGemini(events as FinancialEvent[]);
      res.json({ text });
    } catch (error) {
      console.error("Generate briefing error", error);
      res.status(500).json({ error: "Failed to generate briefing text." });
    }
  });

  app.post("/api/tts", requireAuth, async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
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
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        return res.status(500).json({ error: "ElevenLabs API call failed" });
      }

      const audioBuffer = await response.arrayBuffer();
      res.set("Content-Type", "audio/mpeg");
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error("TTS error", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
