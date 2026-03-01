import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ path: ".env", override: true });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId) {
  throw new Error("Missing GOOGLE_CLIENT_ID in .env");
}

if (!clientSecret) {
  throw new Error("Missing GOOGLE_CLIENT_SECRET in .env");
}

if (!redirectUri) {
  throw new Error("Missing GOOGLE_REDIRECT_URI in .env");
}

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
];