import { Router } from "express";
import { google } from "googleapis";
import { supabaseAdmin } from "../services/supabase";
import { createGoogleOAuthClient, GOOGLE_CALENDAR_SCOPES } from "../services/google";

const router = Router();

router.get("/google/connect", (_req, res) => {
  try {
    const oauth2Client = createGoogleOAuthClient();

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_CALENDAR_SCOPES,
    });

    return res.redirect(url);
  } catch (error) {
    console.error("Google connect error:", error);
    return res.status(500).json({ error: "Failed to start Google OAuth flow" });
  }
});

router.get("/google/callback", async (req, res) => {
    try {
      const code = req.query.code as string | undefined;
  
      if (!code) {
        return res.status(400).json({ error: "Missing authorization code" });
      }
  
      const oauth2Client = createGoogleOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
  
      oauth2Client.setCredentials(tokens);
  
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  
      const now = new Date().toISOString();
  
      const eventsResponse = await calendar.events.list({
        calendarId: "primary",
        timeMin: now,
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });
  
      const googleEvents = eventsResponse.data.items ?? [];
  
      const normalizedEvents = googleEvents
        .filter((event) => event.id && event.start?.dateTime)
        .map((event) => ({
          google_event_id: event.id!,
          title: event.summary || "Untitled Event",
          description: event.description || null,
          location: event.location || null,
          start_time: event.start?.dateTime || event.start?.date || null,
          end_time: event.end?.dateTime || event.end?.date || null,
          estimated_cost: 0,
          category: "Uncategorized",
          source: "calendar",
        }));
  
      if (normalizedEvents.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("events")
          .upsert(normalizedEvents, {
            onConflict: "google_event_id",
          });
  
        if (upsertError) {
          return res.status(500).json({
            error: "Failed to store Google events in Supabase",
            details: upsertError.message,
          });
        }
      }
  
      const { data: storedEvents, error: fetchStoredError } = await supabaseAdmin
        .from("events")
        .select("*")
        .order("start_time", { ascending: true });
  
      if (fetchStoredError) {
        return res.status(500).json({
          error: "Events stored, but failed to fetch from Supabase",
          details: fetchStoredError.message,
        });
      }
  
      return res.json({
        ok: true,
        message: "Google Calendar connected and events synced successfully",
        synced_count: normalizedEvents.length,
        stored_events: storedEvents,
      });
    } catch (error) {
      console.error("Google callback error:", error);
      return res.status(500).json({ error: "Failed to complete Google OAuth flow" });
    }
  });

export default router;