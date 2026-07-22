# Gimmeleads Dialer — Go-Live Runbook

The ordered checklist from "code is built" to "AI is booking meetings." Steps
marked 🖥️ happen in your Centerfy/MogulOS dashboards (only you can do those);
steps marked 💻 are commands you run locally.

**Decision locked:** this is the **internal lead-gen** dialer. The AI speaks as
**Postema Media Management Studios (PMM)** — the studio that builds websites +
AI agents — offering a free demo website *and* a live AI agent, and booking a
15-min review call. ("Gimmeleads" is the internal campaign/list label, not spoken
on the call.) It is *not* selling the dialer (that's Phase 2, different agent/brand).

---

## ✅ Phase 0 — Already built (in this repo)
- `dialer/` — list → Centerfy pipeline (`prep`, `push`, `verify`). Centerfy
  credentials **already verified green** against the live API.
- `bridge/` — Centerfy → MogulOS webhook receiver (`verify`, `start`).
- `landing/` — Gimmeleads/LeadPilot landing site.
- `docs/centerfy-calling-workflow.md` — the agent prompt + workflow build.
- Audit Engine harvest feeds `prep` directly (priority/category filters).

---

## 🖥️ Phase 1 — Centerfy dialer sub-account
- [ ] Create a dedicated sub-account named **Gimmeleads** (with Centerfy
      Unlimited this is free). This keeps dialer data out of real client accounts.
      *(Or, to move fast, reuse the already-verified "Motivation and Success"
      account for the first test and switch later.)*
- [ ] In it: assign a caller-ID number (Settings → **Phone System**).
- [ ] Confirm **outbound Voice AI** is enabled (Flexible Outbound Framework:
      no opt-in gate, ~1,000 calls/day, ~10/min — one sub-account is plenty).
- [ ] If you made a new sub-account: regenerate a Private Integration Token
      there (scopes: View+Edit Contacts, View Workflows, View Locations), grab
      the new `…/v2/location/<ID>` id, and update `dialer/.env`.

## 🖥️ Phase 2 — Build the calling agent + workflow
Follow `docs/centerfy-calling-workflow.md`:
- [ ] Create the **Voice AI agent** — paste the finalized Gimmeleads prompt from
      the doc; give it calendar access to your booking calendar.
- [ ] Create a **workflow**: action **Voice AI Outbound Call** (agent + number)
      → outcome branches (booked / not-interested / no-answer→SMS) → **Outbound
      Webhook** to the bridge (paste the JSON body from the doc, `route:"gimmeleads"`).
- [ ] **Publish** it. Copy `…/automation/workflow/<ID>` into `dialer/.env` as
      `CENTERFY_WORKFLOW_ID`.
- [ ] 💻 `cd dialer && node src/cli.js verify` → confirm the workflow now resolves.

## 🖥️💻 Phase 3 — Deploy the bridge + MogulOS
- [ ] 🖥️ In **MogulOS**, create a Private Integration Token (scopes: View+Edit
      Contacts, Notes write, View Locations, + Calendars write for booking).
- [ ] 🖥️ Grab the MogulOS **location id(s)** results should land in.
- [ ] 💻 `cd bridge && cp .env.example .env` → fill `BRIDGE_SECRET` (invent it),
      `MOGULOS_PIT_TOKEN`, `DEFAULT_LOCATION_ID`.
- [ ] 💻 `cp routing.example.json routing.json` → set `"gimmeleads": "<mogulos-location-id>"`.
- [ ] 💻 `npm install && npm run verify` → confirm token + every location resolve.
- [ ] Host the bridge somewhere Centerfy can reach (its public URL goes in the
      Phase 2 webhook action). `npm start` locally + a tunnel works for testing.

## 💻🖥️ Phase 4 — One test call (prove the loop)
- [ ] 💻 Make a 1-row CSV with **your own** business number. `node src/cli.js prep
      --in me.csv --out out/test.csv` → `node src/cli.js push --in out/test.csv
      --tag "gimmeleads-test"`.
- [ ] 🖥️ Confirm the contact appears in Centerfy and the workflow calls you.
- [ ] Take the call as if you were a prospect; let it try to book.
- [ ] 🖥️ Check the bridge received the webhook and the result + note (and
      appointment) landed in the MogulOS location. Fix any field mapping.

## 💻 Phase 5 — Go live
- [ ] Harvest a ZIP (audit-engine-harvest) → `leads_harvest.csv`.
- [ ] `node src/cli.js prep --in leads_harvest.csv --out out/clean.csv
      --min-priority B --category "<trades>" --suppress dnc.txt`
- [ ] `node src/cli.js push --in out/clean.csv --tag "gimmeleads-<zip>"`
- [ ] Watch bookings land in MogulOS. Scale by adding sub-accounts only if you
      exceed ~1,000 calls/day.

---

## Compliance gate (do not skip)
The platform no longer enforces consent — **you** do. Only dial lists you
legally own the right to call, keep to B2B business lines, scrub DNC via
`prep --suppress`, respect the 8am–8pm local window, and honor removals. Get
counsel on any list whose legal footing is unclear.

## Brand map (so it stays straight)
- **Postema Media Management Studios (PMM)** — the service brand the AI *calls as*;
  sells & builds the websites + AI agents, and closes the booked review calls.
- **Gimmeleads** — internal lead-gen campaign/list label (the dialer sub-account /
  tags). Not spoken on the call.
- **MogulOS** — your white-label GHL where results/CRM live (the storefront).
- **LeadPilot AI** — the dialer product itself, for Phase 2 SaaS resale (later).
- **Centerfy** — the hidden voice engine underneath it all.
