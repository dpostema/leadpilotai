# LeadPilot Dialer Pipeline

Internal tool that turns a raw **B2B list** into calls placed by the **Centerfy**
voice-AI dialer. Centerfy is white-label GoHighLevel, so this talks to the
standard **GHL API v2 (LeadConnector)** with a Private Integration Token.

```
raw list.csv  ──prep──►  clean.csv  ──push──►  Centerfy contacts ──► calling workflow
             (normalize,            (upsert via
              dedupe, DNC)           GHL API v2)
```

## Setup

```bash
cd dialer
npm install
cp .env.example .env      # then fill in the three Centerfy values
```

Get the values from your Centerfy **dialer sub-account**:
- `CENTERFY_PIT_TOKEN` — Settings → Private Integrations → new token (contacts + workflows scopes)
- `CENTERFY_LOCATION_ID` — the `…/v2/location/<ID>/…` id from the browser URL inside the sub-account
- `CENTERFY_WORKFLOW_ID` — Automation → Workflows → open your outbound calling workflow → id from the URL

## Use

**0. Verify your credentials first** (catches typos before any real dial):

```bash
node src/cli.js verify
```

Confirms the token works, the location resolves (prints its name), and the
workflow id exists in that location. Fix any ✗ before running `push`.

**1. Clean a list** (auto-detects common column names; normalizes to E.164, dedupes, drops invalid):

```bash
node src/cli.js prep --in leads.csv --out out/clean.csv --suppress dnc.txt
```

`--suppress` is optional — a text file of one phone per line to exclude (your
DNC / do-not-call suppression list).

**2. Push to the dialer** (upserts contacts, enrolls them in the calling workflow):

```bash
node src/cli.js push --in out/clean.csv --tag "spring-b2b" --dry-run   # preview
node src/cli.js push --in out/clean.csv --tag "spring-b2b"             # for real
```

`--dry-run` prints what would be sent without calling the API. Re-running `push`
is safe: GHL upserts by phone within the location, so contacts aren't duplicated.

## Testing

```bash
npm test    # unit tests for phone normalization, dedupe, DNC, and harvest filters
```

## Feeding it from the Audit Engine (no-website harvest)

The `audit-engine-harvest` skill produces a CSV of no-website B2B businesses
(`priority, business_name, category, phone, address, zip, …`). `prep` reads that
schema directly and can filter it, so the whole "find → clean → call" loop is:

```bash
# 1. harvest a ZIP with the audit-engine-harvest skill -> leads_harvest.csv
# 2. keep only A/B tiers in the trades you want, clean + dedupe:
node src/cli.js prep --in leads_harvest.csv --out out/clean.csv \
  --min-priority B --category "plumber,roofing,hvac" --suppress dnc.txt
# 3. dial them:
node src/cli.js push --in out/clean.csv --tag "napoleon-harvest"
```

- `--min-priority A|B|C|D` — keep only rows at or above a tier (harvest ranks by review count: A=50+, B=10–49, C=1–9, D=none).
- `--category "a,b,c"` — keep only rows whose category matches one of these (substring, case-insensitive).

`zip`, `category`, and `priority` carry through to the cleaned file so you can
segment campaigns.

## Compliance note (B2B)

This is built for **B2B business-line** calling. Even so: scrub against the
National DNC and any applicable state B2B rules (use `--suppress`), call within
business hours, and identify your company in the script. AI-voice calls to
consumer cell numbers without prior express written consent carry TCPA risk —
keep this to business lines.

## How it fits the bigger picture

This is the first half of the **MogulOS ↔ Centerfy bridge**: it feeds lists into
the Centerfy engine. The return half (call outcomes / booked appointments →
back into the client's MogulOS CRM) is a webhook receiver, added later.
