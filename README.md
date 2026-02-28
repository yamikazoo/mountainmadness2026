# mountainmadness2026

# 💎 FinSync: The Temporal Wealth Agent

**"Your life is busy. Your finances shouldn't be a surprise."**

---

## 🌟 The Vision

Traditional finance apps tell you what you *already spent*. **FinSync** tells you what you’re *about to spend*.

By merging your **multi-calendar life** (Google/Outlook) with your **financial documents** (leases, bills, research papers) using a **Multimodal RAG Agent**, FinSync transforms unpredictable schedules into actionable financial foresight. We leverage social dynamics and AI-driven gamification to turn "saving money" from a chore into a collaborative game.

Our system predicts what you're about to spend from syncing calendar or reminders information and predicts upcoming cash flow. 
Forget to add something to the calendar or have bills that are mailed? Don't worry! You can also upload financial documents such as receipts or bills and our app
will track it as well.
All this is enveloped using an easy to use interface and an AI voice agent via ElevenLabs for a smooth user experience.

---

## ✨ Key Features

### 📅 1. The Financial Time-Machine (RBC Challenge)

* **Calendar Sync:** FinSync parses your calendar events (e.g., "Whistler Trip," "Mom's Birthday," "Monthly Rent") and predicts upcoming cash flow.
* **Predictive Insights:** It doesn't just see a "Trip" event; it uses **Gemini** to estimate costs based on your past spending and current market data.

### 📄 2. Multimodal RAG "Paper-to-Plan"

* **Smart Document Parsing:** Upload a messy lease agreement, a complex utility bill, or even a financial research paper.
* **Automated Budgeting:** Our RAG pipeline extracts key dates and amounts, automatically adding "Rent Increase" or "Payment Due" notifications to your financial calendar.

### 🎮 3. Social Savings Circles & Gamification

* **Community Challenges:** Join "Savings Circles" with friends for shared goals (e.g., "Grad Trip Fund").
* **Loss Aversion Gamification:** If the group stays on track, you unlock digital badges and "Streaks." If someone slips, the **AI Coach** sends a playful, voice-narrated nudge to the group. EDIT THIS

### 🎙️ 4. The Morning "Hype" Briefing

* **ElevenLabs Integration:** Every morning, receive a 30-second high-fidelity audio brief.
* *“Hey Calvin, you’ve got a busy day. You’re meeting friends for dinner—aim for under $30 to keep your Whistler streak alive!”*



---

## 🛠️ Technical Architecture

* **Frontend:** Next.js, React, Tailwind CSS (Mobile-responsive for judges).
* **AI/LLM:** * **Gemini 1.5 Flash:** Powers the Multimodal RAG for document analysis and intent extraction.
* **ElevenLabs API:** Generates personalized, emotionally expressive voice briefings.


* **Data & Backend:** * **Snowflake:** Stores large-scale transaction embeddings and anonymized peer-benchmarking data.
* **PostgreSQL:** Handles core user data and social group states.


* **Cloud:** Hosted on **DigitalOcean** for high availability.

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

## 👥 The Team

Built with ❤️ by a team of **SFU Software Systems** students.

* [Teammate 1] - File analysis / RAG Architect
* [Teammate 1] - Feature cohesion / Frontend / UI/UX
* [Teammate 2] - Backend / API integration

---

**Would you like me to expand on the "Social Challenges" logic or help you refine the pitch deck content next?**
