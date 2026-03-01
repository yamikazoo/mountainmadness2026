# NOMI Pivot (Current Stack MVP)

NOMI Pivot is a proactive personal finance prototype for SFU Mountain Madness and the RBC FutureSpend challenge.  
This repo currently runs on **React + Vite frontend** with an **Express backend**.

## What is implemented in Sprint 1/2

- Google OAuth login with scope: `https://www.googleapis.com/auth/calendar.readonly`
- Session-based backend auth (`HttpOnly` cookie)
- Server endpoint to fetch next 7 days of Google Calendar events
- Robust fallback to 3 realistic mock events for demo reliability
- Auth-gated dashboard experience with calendar event cards
- Gemini calls moved server-side (no client-side API key exposure)

## Tech stack

- Frontend: React + Tailwind CSS + Lucide + Motion
- Backend: Express + better-sqlite3
- AI: Gemini API + ElevenLabs
- Auth: Google OAuth (server-managed)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill values:

```bash
cp .env.example .env.local
```

3. Add required values in `.env.local`:

- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (default: `http://localhost:3000/auth/google/callback`)
- `GEMINI_API_KEY`

4. Run:

```bash
npm run dev
```

5. Open:

`http://localhost:3000`

## Google OAuth Console checklist

In Google Cloud Console:

1. Enable **Google Calendar API**
2. Configure OAuth consent screen
3. Add scope:
   - `https://www.googleapis.com/auth/calendar.readonly`
4. Create OAuth Client (Web application)
5. Add Authorized redirect URI:
   - `http://localhost:3000/auth/google/callback`
6. Add your teammate/tester emails to **Test users** while app is in testing mode

## Demo behavior

- Signed-out users must log in with Google.
- Signed-in users see a calendar grid for the next 7 days.
- If Google API is unavailable/rate-limited, dashboard shows a fallback banner and mock events.
