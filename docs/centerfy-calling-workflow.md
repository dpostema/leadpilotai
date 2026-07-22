# Building the Centerfy Outbound Voice-AI Calling Workflow

This is the missing piece between "leads land as contacts in Centerfy" and "the
AI actually calls them." Centerfy is white-label GoHighLevel, so this is GHL's
**Voice AI Outbound Calling** (launched late 2025, standard in 2026). Menu names
may read "Centerfy AI Assistant" instead of "AI Voice" — same feature.

Once built, the dialer enrolls leads into this workflow (via `CENTERFY_WORKFLOW_ID`)
and the bridge writes the results back to MogulOS. Full loop.

---

## Prerequisites (one-time, in the Centerfy dialer sub-account)

1. **Voice AI / AI Employee enabled.** Outbound Voice AI is the paid tier
   (GHL: "AI Employee Plus," ~$0.06/min + model tokens; NOT covered by the $97
   inbound-unlimited plan). Confirm your Centerfy lifetime plan covers **outbound**
   — this is the item still to verify from your dashboard.
2. **A phone number** assigned as caller ID: Settings → **Phone System**.
3. **A calendar** the agent can book into: Calendars → your booking calendar.

---

## Step 1 — Build the Voice AI agent

Settings → **Integrations → AI Voice** (or **Centerfy AI Assistant**) → create an
agent. The agent's behavior is driven entirely by its **system prompt**. Start
from this template (edit the bracketed bits):

```
You are Riley, a friendly, concise scheduling assistant calling on behalf of
[COMPANY] — [ONE-LINE WHAT YOU DO]. You are calling local businesses.

GOAL: find out if this business is a fit for [OFFER], and if so, book a short
[MEETING TYPE] on the calendar. Booking the meeting is success.

OPENING: greet, say who you're with in one sentence, and ask if they have a
quick moment. If it's a bad time, offer to find a better time and end politely.

QUALIFY (ask naturally, don't interrogate):
  1. Are you the right person to talk to about [DECISION AREA]?
  2. [QUALIFYING QUESTION 2]
  3. [QUALIFYING QUESTION 3]

IF QUALIFIED: offer two specific open slots and confirm one. Read the details
back. Confirm the best number/email for the invite.

GUARDRAILS:
  - Never quote prices or make promises beyond booking the meeting.
  - If asked something you don't know, say a specialist will cover it on the call.
  - If they ask to be removed, acknowledge, mark do-not-contact, and end.
  - Keep it conversational and brief. One question at a time.

HAND OFF to a human if they ask to speak to someone or get frustrated.
```

Give the agent **calendar access** (there's a booking/calendar setting on the
agent) so it can offer real open slots and confirm on the call.

---

## Step 2 — Build the workflow

Automation → **Workflows → Create workflow**.

- **Trigger:** leave it as manual/API enrollment — the dialer enrolls contacts
  directly through the API (`push` → `CENTERFY_WORKFLOW_ID`), so you don't need a
  tag trigger. (If you'd rather trigger by tag, add a "Contact Tag" trigger and
  have `push` apply that tag with `--tag "your-trigger-tag"`.)
- **Action 1: Voice AI Outbound Call** — select your agent (Step 1) and the
  caller-ID number (prereq 2).
- **Branch on the outcome** (add If/Else or use the call-result fields):
  - *Booked / interested* → (the agent books directly; add a tag `booked`)
  - *Not interested* → tag `not-interested`, remove from further calls
  - *No answer / voicemail* → wait, then **Send SMS** follow-up, optionally retry
- **Action (all branches): Outbound Webhook → the bridge** so results reach
  MogulOS. URL `https://<your-bridge-host>/webhook/centerfy`, header
  `x-bridge-secret: <BRIDGE_SECRET>`, body with `route`, `contact`, `call`, and
  `appointment` (see `bridge/README.md`).
- **Publish** the workflow. Copy its id from the URL
  (`…/automation/workflow/<ID>`) into `dialer/.env` as `CENTERFY_WORKFLOW_ID`,
  then re-run `node src/cli.js verify` — it should now show the workflow resolves.

---

## Step 3 — Connect the pipeline

```
audit-engine-harvest ─► dialer prep ─► dialer push (enrolls into this workflow)
                                            │
                                   Voice AI Outbound Call
                                            │  outcome + transcript
                                   Outbound Webhook ─► bridge ─► MogulOS sub-account
```

---

## Constraints you must design around (GHL native limits)

These are real and they shape volume/architecture:

- **Opt-in gate.** GHL enforces contact **opt-in/consent** for outbound Voice AI.
  This is the "can't call a raw list without opt-in" wall you already hit. For
  B2B business lines, set the consent/opt-in field on import and keep to business
  numbers; confirm whether Centerfy's white-label layer relaxes or keeps this.
- **Rate limits (per sub-account/location):** ~1 call/min, **max ~100 calls/day**,
  a rolling 14-day **max ~4 calls/contact**, and calling **10am–6pm the contact's
  local time, US numbers only.**
- **Volume implication:** ~100 calls/day/location means high volume needs
  **multiple sub-accounts** (one reason the per-client architecture scales) or
  Centerfy's own outbound rate rather than GHL-native. Plan campaigns to the cap.

## Compliance (B2B)
Business-line B2B is the lower-risk lane. Still: scrub DNC (`dialer prep
--suppress`), identify your company in the opening, respect the calling window,
and honor removal requests (the agent prompt does this).

---

## Sources
- HighLevel — Voice AI Outbound Calling (help portal)
- HighLevel — Appointment Booking for Voice AI Agents (help portal)
- ai2flows — GHL Voice AI Outbound Calling setup & booking guide (2026)
- gohighlevel.ai — AI Employee plan & Voice AI setup (2026)
