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
agent. The agent's behavior is driven entirely by its **system prompt**. This is
the finalized prompt. The agent speaks as **Postema Media Management Studios
(PMM)** — the studio that builds the websites + AI agents. ("Gimmeleads" is only
the internal campaign/list label, never spoken on the call.) Paste as-is; tweak
the calendar/slot wording to match your calendar:

```
You are Riley, a warm, concise assistant calling on behalf of Postema Media
Management Studios, a local studio that builds websites and AI phone/chat agents
for small businesses. You are calling local businesses that don't have a website.

GOAL: get the owner interested in a FREE demo — a sample website for their
business AND a live AI agent like the one they're speaking with — and book a
15-minute review call. Booking that call is success.

OPENING: greet, say in one sentence that you're with Postema Media Management
Studios and you build websites and AI agents for local businesses, and ask if
they have a quick moment. If it's a bad time, offer a better time and end politely.

LIVE-DEMO ANGLE (use if it fits naturally): mention that the voice they're
talking to right now is exactly the kind of AI agent PMM can build to answer
their phones 24/7 — a real, live example of the product.

QUALIFY (natural, one question at a time):
  1. Am I right that you don't have a website up yet, or just a social page?
  2. Are you the right person to talk to about the business's online presence?
  3. If we put together a free demo site and an AI agent for you to see, would
     that be worth 15 minutes?

IF INTERESTED: offer two specific open slots and confirm one. Read the details
back and confirm the best email for the calendar invite and the demo link.

GUARDRAILS:
  - It's a FREE demo and a FREE review call — never quote prices or promise results.
  - If asked something technical you don't know, say the specialist covers it on the call.
  - If they ask to be removed, acknowledge, mark do-not-contact, and end the call.
  - Keep it brief and human. Don't pitch hard. One question at a time.

HAND OFF to a human if they ask or get frustrated.
```

Give the agent **calendar access** (there's a booking/calendar setting on the
agent) so it can offer real open slots and confirm on the call.

> Later, when Phase 2 (selling the dialer as SaaS) begins, you'll clone this
> agent with a different prompt/brand. This PMM agent is the internal lead-gen caller.

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
  MogulOS. URL `https://<your-bridge-host>/webhook/centerfy`, method POST,
  header `x-bridge-secret: <BRIDGE_SECRET>`. Paste this **custom JSON body** and
  map each value from the workflow's variable picker (the `{{…}}` tokens are GHL
  variables — insert the real ones the builder offers; names vary slightly by
  account):

```json
{
  "event": "call_completed",
  "route": "gimmeleads",
  "contact": {
    "phone": "{{contact.phone}}",
    "email": "{{contact.email}}",
    "firstName": "{{contact.first_name}}",
    "business": "{{contact.company_name}}"
  },
  "call": {
    "status": "{{call.status}}",
    "disposition": "{{call.disposition}}",
    "duration": "{{call.duration}}",
    "summary": "{{call.summary}}",
    "transcript": "{{call.transcript}}",
    "recording_url": "{{call.recording_url}}"
  }
}
```

  Set `route` per campaign so results land in the right MogulOS sub-account (it
  maps through `bridge/routing.json`). For the booking branch, also include an
  `"appointment"` object with `calendarId`, `startTime`, and `title` so the
  bridge books it in MogulOS. The bridge tolerates both these snake_case names
  and clean camelCase, so don't worry if your account labels a variable slightly
  differently.
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

## Constraints you must design around (Flexible Outbound Framework)

HighLevel's **Voice AI Flexible Outbound Calling Framework** (which Centerfy
inherits as a white-label platform) moved consent enforcement off the platform
and lifted the old low caps. Current state:

**Lifted:**
- **No platform opt-in gate.** The platform no longer validates contact consent
  before an outbound AI call. You can import raw B2B lists and the workflow runs
  immediately — no native opt-in tag/form required.
- **Volume:** eligible locations can place up to **~1,000 outbound calls/day**,
  at up to **~10 calls/min** per location (was ~100/day and ~1/min).

**Still hard-enforced (cannot bypass):**
- **Per-number caps:** a number can be called **once per day**, max **~14 times
  over a rolling 14-day window**.
- **Calling hours:** **8am–8pm local** to the recipient's area code.
- **Geofencing:** domestic only — same country as the sub-account.

**Architecture implication:** because one sub-account now clears ~1,000 calls/day
at 10/min, the **single central-dialer model is viable** — you no longer need to
shard modest volume across many sub-accounts just to beat a 100/day cap.

## Compliance — this is now entirely on you
The platform removing its opt-in gate does **not** remove the law. TCPA/FTC
responsibility shifts fully to your business: Centerfy is just the conduit, and
you must legally own the right to dial each lead. B2B business lines are the
lower-risk lane, but still: scrub DNC (`dialer prep --suppress`), keep to
business numbers, identify your company in the opening, respect the 8am–8pm
window, and honor removal requests (the agent prompt does this). When in doubt
on a list's legal footing, get counsel before dialing it.

---

## Sources
- HighLevel — Voice AI Outbound Calling (help portal)
- HighLevel — Appointment Booking for Voice AI Agents (help portal)
- ai2flows — GHL Voice AI Outbound Calling setup & booking guide (2026)
- gohighlevel.ai — AI Employee plan & Voice AI setup (2026)
