# CLAUDE.md — LeadPilot / Gimmeleads AI

Context for a Claude Code session picking up this project. Read this first, then
`STATUS.md` and `GO-LIVE-RUNBOOK.md`.

## What this is
An AI cold-calling machine for **Gimmeleads AI** (a lead-generation company). It
calls B2B businesses as **Postema Media Management (PMM)**, qualifies them, books
demos, and writes the results into a CRM. Built to run internally first, then be
sold as a SaaS.

## Brand map (keep these straight)
- **Gimmeleads AI** — the lead-gen company; runs the LeadPilot dialer (its Centerfy sub-account).
- **LeadPilot AI** — the dialer product *inside* Gimmeleads (the tool; future SaaS name).
- **PMM (Postema Media Management)** — the studio the AI calls *as*; sells websites + AI agents; closes booked demos.
- **MogulOS** — white-label GHL where client CRMs / booked results live.
- **Centerfy** — white-label GHL providing the Voice AI calling engine (hidden from clients).

## Architecture / flow
```
Harvest list → DIALER (prep/push) →┐
Website click-to-call form → ───────┤→ CENTERFY (PMM agent calls, qualifies, books)
                                    │        │ outcome webhook
                                    │      BRIDGE (Render)
                                    ▼        ▼
                            MOGULOS · PMM (contact + note + appt) → PMM closes
```
**Centerfy talks, MogulOS remembers.**

## Repo layout
- `dialer/` — Node CLI: `prep` (clean/filter a list) + `push` (into Centerfy, tags contacts) + `verify`. `npm test`.
- `bridge/` — Node/Express: receives Centerfy call results → writes contact+note(+appt) into MogulOS. Hosted on Render. `npm run verify`, `npm run send-test`.
- `landing/index.html` — Gimmeleads marketing site (black/gold/chrome, click-to-call widget). Self-contained; `CONFIG.WEBHOOK_URL` slot at bottom.
- `docs/` — `centerfy-calling-workflow.md`, `consent-language.md`, `gimmeleads-lovable-brief.md`.
- `GO-LIVE-RUNBOOK.md`, `STATUS.md` — state + go-live checklist.
- `website-downloader/` — unrelated earlier tool; ignore.

## Key references (NON-SECRET)
- Centerfy dialer sub-account: **Gimmeleads AI** · location `z1Uvu4jXbfTpzUWn5W9Z`
- MogulOS destination: **PMM** · location `LbrNfCh7hoikijRg84iw`
- Bridge URL: `https://leadpilot-bridge.onrender.com` (`/health`, `/webhook/centerfy`)
- Caller-ID number: `+1 419 518 5829`
- Enrollment tag (fires the workflow): `gimmeleads-call`
- Work branch: `claude/website-downloader-install-tlybe6`

## Secrets (NEVER commit)
`BRIDGE_SECRET`, `MOGULOS_PIT_TOKEN`, `CENTERFY_PIT_TOKEN` live only in local `.env`
+ Render env + Centerfy webhook headers. `.env` and `routing.json` are gitignored.

## Current state
- ✅ Dialer verified against Centerfy (creates + tags contacts)
- ✅ PMM Voice AI agent built; agent "Call Me" test rings
- ✅ Calling workflow "AI Outbound Lead Calling" published (tag trigger `gimmeleads-call`)
- ✅ Bridge hosted on Render, tested writing into PMM (`ok:true`)
- ✅ Gimmeleads site finalized (fabricated stats + fake testimonials removed)
- ⛔ **BLOCKED:** Centerfy **KYC / outbound-calling approval** (support ticket open). Workflow Voice AI calls enroll + log "Executed" but never deliver until approved.

## Finish-today tasks (NOT blocked by KYC)
1. **Build the Centerfy "Web Click-to-Call" workflow** (Gimmeleads AI sub-account):
   Inbound Webhook trigger → POST one sample from the site to map fields → create/
   update contact + tag → branch on `channel`: `call` → **Voice AI Outbound Call**
   (PMM agent + caller number) / `email` → **Send Email**. Copy the trigger URL →
   paste into `landing/index.html` `CONFIG.WEBHOOK_URL`. Host the site.
2. **Fix the Call Outcome Branch** in the outbound workflow — its conditions wrongly
   check the agent's from-number (`+14195185829`) instead of the contact, so
   Booked/Not-Interested/No-Answer don't route. Correct them.
3. **Set the agent's booking calendar** (real availability) so it can book on calls.
4. **Pre-stage launch:** create `dialer/dnc.txt` (one number per line); harvest a ZIP
   (needs `GOOGLE_PLACES_API_KEY`) → `prep` → staged `out/clean.csv`.
5. **Housekeeping:** delete test contacts ("Bridge Test"/"Rotate Test") in PMM; set up
   a real opt-out inbox; consider Render's $7 tier (free tier cold-start delays webhooks).

## When KYC clears
```
cd dialer
# put a real, fresh number in me.csv
node src/cli.js prep --in me.csv --out out/test.csv
node src/cli.js push --in out/test.csv --tag "gimmeleads-call"
```
Phone should ring with the PMM agent; confirm the booking + note land in PMM. Then go
live: harvest ZIP → `prep --min-priority B --category "..." --suppress dnc.txt` → `push --tag "gimmeleads-call"`.

## Commands
- Dialer: `cd dialer && node src/cli.js verify|prep|push`; `npm test`
- Bridge: `cd bridge && npm run verify && npm start`; `npm run send-test`

## Conventions
- Work on branch `claude/website-downloader-install-tlybe6`; commit + push when a change is complete.
- Never commit secrets; keep `.env` / `routing.json` local.
- B2B business lines only. Compliance is on us (platform dropped its opt-in gate) — scrub DNC via `prep --suppress`, honor opt-outs.

## SaaS roadmap
See the handoff plan (Phases 1→2→3): **finish internal → concierge SaaS → automated
self-serve**. Pricing floor is Centerfy (~$0.07/min white-label); price **above that
but below GHL-native (~$0.13/min) and competitors (Vapi $0.18–0.25, Synthflow $0.45)**
for margin.
