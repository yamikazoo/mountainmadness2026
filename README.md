# mountainmadness2026

# FinSync: The Temporal Wealth Agent

**"Your life is busy. Your finances shouldn't be a surprise."**

---

## The Vision

Traditional finance apps tell you what you *already spent*. **FinSync** tells you what you’re *about to spend*.

By analyzing your **calendar life** (Google calendar) with your uploaded **financial documents** (leases, bills, receipts), FinSync transforms unpredictable schedules into actionable financial foresight.  We leverage social dynamics by allowing you to join "circles" with your friends, competing to see who can keep their expenses the lowest or holding each other accountable while saving for a group trip. This turns "saving money" from a chore into a collaborative game.

Our system predicts what you're about to spend from syncing calendar or reminders information and predicts upcoming cash outflow.

Forget to add something to the calendar or have bills that are mailed? Don't worry! You can also upload financial documents such as receipts or bills to our app and it will track it as well.

All this is enveloped using an easy to use interface complete with charts and visuals and an AI voice agent via ElevenLabs that summarizes all your information for a smooth user experience.

---

## ✨ Key Features

### 1. The Financial Time-Machine (RBC Challenge)

* **Calendar Sync:** FinSync parses your calendar events (e.g., "Whistler Trip," "Mom's Birthday," "Monthly Rent") and predicts upcoming cash flow.
* **Predictive Insights:** It doesn't just see a "Trip" event; it uses **Gemini** to estimate costs based on your past spending, current market data and logical inference.

### 2. Multimodal RAG "Paper-to-Plan"

* **Smart Document Parsing:** Upload a messy lease agreement, a complex utility bill, or even a financial research paper.
* **Automated Budgeting:** Our RAG pipeline extracts key dates and amounts, automatically adding "Rent Increase" or "Payment Due" events to your calendar.

### 3. Social Savings Circles & Gamification

* **Community Challenges:** Join "Savings Circles" with friends for shared goals (e.g., "Grad Trip Fund") or for some friendly saving competition.
* **Loss Aversion Gamification:** A saving and expenses leaderboard helps keep you and your friends in check. If someone slips and starts spending, they fall down the leaderboard and everyone will be made aware of their poor financial habits.

* 
### 🎙️ 4. The Morning "Hype" Briefing

* **ElevenLabs Integration:** Busy or a TLDR kind of person? We have a feature where you can receive a 30-second high-fidelity audio brief about your upcoming expenses and financial advice.
* *“Hey Calvin, you’ve got a busy day. You’re meeting friends for dinner—aim for under $30 to keep your Whistler streak alive!”*



---

## Technical Architecture

* **Frontend:** Next.js, React, Tailwind CSS (Mobile-responsive).
* **AI/LLM:** * **Gemini 1.5 Flash:** Powers the Multimodal RAG for document analysis and intent extraction.
* **ElevenLabs API:** Generates personalized, emotionally expressive voice briefings.


* **Data & Backend:** * **Snowflake:** Stores large-scale transaction embeddings and anonymized peer-benchmarking data.
* **PostgreSQL:** Handles core user data and social group states (Supabase).

---

## 🏆 Prize Track Alignment

| Track | Implementation |
| --- | --- |
| **RBC Personal Finance** | Focus on "Multi-calendar life" and "Social dynamics" through predictive event-based budgeting. |
| **[MLH] Best Use of Gemini** | Multimodal RAG to process images/PDFs of financial documents and extract structured JSON data. |
| **[MLH] Best Use of ElevenLabs** | Dynamic "Financial Coach" voices that provide daily verbal summaries and social nudges. |
| **[MLH] Best Use of Snowflake** | Utilizing the Snowflake API for high-performance vector storage and community spending analytics. |
| **Best UI/UX** | A clean, "Calendar-first" dashboard that visualizes the future of your wallet. |

---

## 🚀 Getting Started

1. **Clone the repo:** `git clone https://github.com/your-team/finsync`
2. **Install dependencies:** `npm install`
3. **Set up Environment Variables:** (Add your Gemini, ElevenLabs, and Snowflake keys).
4. **Run Dev:** `npm run dev`

---

## The Team

* Talla - File analysis / RAG Architect
* Calvin - Feature cohesion / Frontend / UI/UX
* Alex - Backend / API integration

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

View the app in AI Studio: https://ai.studio/apps/4962968a-afe7-42c1-adfa-33a3e4ef4e71

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `API KEYS` in [.env.local](.env.local) to your designated API keys
3. Run the app:
   `npm run dev`
