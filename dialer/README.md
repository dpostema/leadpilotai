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
