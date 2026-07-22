# LeadPilot Bridge (Centerfy → MogulOS)

The **return half** of the MogulOS ↔ Centerfy bridge. A small webhook receiver:
Centerfy's calling workflow POSTs each call result here, and the bridge writes
it into the correct **MogulOS** sub-account (contact + note, optional appointment).

```
Centerfy calling workflow ──POST /webhook/centerfy──► bridge ──GHL API v2──► MogulOS sub-account
                                                    (route → location)      (upsert contact,
                                                                             add note, book appt)
```

## Setup

```bash
cd bridge
npm install
cp .env.example .env               # fill in BRIDGE_SECRET + MOGULOS_PIT_TOKEN
cp routing.example.json routing.json   # map routes -> MogulOS location ids
npm run verify                         # check token + every routed location resolves
npm start
```

`npm run verify` confirms the MogulOS token is accepted and that
`DEFAULT_LOCATION_ID` plus every id in `routing.json` resolves to a real
sub-account (prints each name), so a mistyped id can't reach production.

- `MOGULOS_PIT_TOKEN` — a Private Integration Token from **MogulOS** (contacts + notes, plus calendars if booking).
- `routing.json` — maps the `route` each Centerfy campaign sends to a MogulOS location id. Unknown routes fall back to `DEFAULT_LOCATION_ID`.

## Endpoints

- `GET /health` → `{ ok, routes }`
- `POST /webhook/centerfy` → requires header `x-bridge-secret: <BRIDGE_SECRET>` (or `?token=`)

### Expected webhook payload (you control this from the Centerfy workflow)

```json
{
  "event": "call_completed",
  "route": "client-acme",
  "contact": { "phone": "+14195550142", "firstName": "Sam", "business": "Acme Roofing" },
  "call": {
    "status": "completed",
    "disposition": "interested",
    "duration": 83,
    "summary": "Wants a quote; call back Tue AM.",
    "transcript": "…",
    "recordingUrl": "https://…"
  },
  "appointment": { "calendarId": "…", "startTime": "2026-07-25T14:00:00Z", "title": "Roofing consult" }
}
```

The bridge upserts the contact, attaches a note with the call summary/transcript/
recording, and — if `appointment.calendarId` + `startTime` are present — books it.

## Wiring it in Centerfy

In the Centerfy calling workflow, add an **outbound webhook** action after the
call completes:
- URL: `https://<your-host>/webhook/centerfy`
- Header: `x-bridge-secret: <BRIDGE_SECRET>`
- Body: map the fields above (set `route` per campaign/client so results land in
  the right MogulOS account).

## Note on hosting

Runs anywhere Node runs and can reach `services.leadconnectorhq.com` (the GHL
API host). Point Centerfy's webhook at its public URL.
