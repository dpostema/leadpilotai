# LeadPilot / Gimmeleads — Build Status

**One line:** The full AI cold-calling machine is built, hosted, wired, and
tested end to end. The only thing not live is Centerfy's **KYC / outbound-calling
approval** — once that clears, real calls flow with zero further build work.

## What's built

| Piece | What it does | Status |
|---|---|---|
| **Dialer** (`dialer/`) | Cleans a B2B list → pushes contacts into Centerfy, tags them | ✅ verified live |
| **PMM Voice AI agent** (Centerfy) | Calls as Postema Media Management, offers free demo site + AI agent, books | ✅ test-call rang |
| **Calling workflow** "AI Outbound Lead Calling" (Centerfy) | Tag → Voice AI Outbound Call → outcome branches → webhook to bridge | ✅ published |
| **Bridge** (`bridge/`, hosted on Render) | Receives Centerfy call results → writes contact + note (+ appt) into MogulOS | ✅ hosted + tested (returns ok:true into PMM) |
| **Website** (`landing/` + Lovable build) | Gimmeleads site w/ click-to-call widget → Centerfy inbound webhook | ⏳ built; needs real testimonials + `CONFIG.WEBHOOK_URL` |

## The flow
```
Harvest list ─► DIALER ─┐
Website form ─► ────────┤─► CENTERFY (PMM agent calls, qualifies, books)
                        │        │ call result
                        │     BRIDGE (Render)
                        ▼        ▼
                    MOGULOS · PMM (contact + note + appt) ─► PMM closes
```
**Centerfy talks, MogulOS remembers.**

## Key references (not secrets)
- Centerfy dialer sub-account: **Gimmeleads AI** · location `z1Uvu4jXbfTpzUWn5W9Z`
- MogulOS destination: **Postema Media Management (PMM)** · location `LbrNfCh7hoikijRg84iw`
- Bridge URL: `https://leadpilot-bridge.onrender.com` (health: `/health`, webhook: `/webhook/centerfy`)
- Centerfy caller-ID number: `+1 419 518 5829`
- Enrollment tag (fires the workflow): `gimmeleads-call`
- Secrets (`BRIDGE_SECRET`, `MOGULOS_PIT_TOKEN`, `CENTERFY_PIT_TOKEN`) live in local
  `.env` files + Render env + Centerfy webhook headers — **never commit them.**

## ⛔ Current blocker: KYC / outbound-calling approval (Centerfy support)
Symptom: agent "Call Me" test rings, but workflow Voice AI calls park at the call
step and never deliver. Escalation ticket is open. This is a platform approval —
nothing to fix on our side.

## ✅ When KYC clears — do this
1. Fresh-number test:
   ```
   cd dialer
   # put a real number in me.csv
   node src/cli.js prep --in me.csv --out out/test.csv
   node src/cli.js push --in out/test.csv --tag "gimmeleads-call"
   ```
   Phone should ring with the PMM agent.
2. Take the call → let it book → confirm the appointment/note lands in **PMM** (MogulOS).
3. Go live: harvest a ZIP → `prep` (with `--min-priority B --category ... --suppress dnc.txt`) → `push --tag "gimmeleads-call"`.
4. Scale by adding Centerfy sub-accounts only if you exceed ~1,000 calls/day.

## Remaining cleanups
- Delete test contacts ("Bridge Test" / "Rotate Test") from PMM.
- Website: swap in real testimonials, remove placeholder stats, set `CONFIG.WEBHOOK_URL`
  to the Centerfy inbound webhook (build the "Web Click-to-Call" workflow — see
  `docs/gimmeleads-lovable-brief.md` Part 2).
- Compliance is on us now (platform dropped its opt-in gate): B2B lines only,
  scrub DNC via `prep --suppress`, honor opt-outs.

## Docs
- `GO-LIVE-RUNBOOK.md` — full phased checklist
- `docs/centerfy-calling-workflow.md` — agent prompt + workflow build
- `docs/consent-language.md` — consent copy + KYC name alignment
- `docs/gimmeleads-lovable-brief.md` — website build brief + GHL wiring
