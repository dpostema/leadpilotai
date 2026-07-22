# LeadPilot AI

## Tools

### [landing/](landing/)

Self-contained marketing landing page for the LeadPilot AI outbound-caller
product — hero with a live-call demo, how-it-works, features, pricing, and FAQ.
Single `index.html`, responsive, light/dark aware. Original LeadPilot copy.

### [dialer/](dialer/)

Internal B2B list → **Centerfy** (white-label GHL) voice-AI dialer pipeline.
Cleans a raw list (E.164 normalization, dedupe, DNC suppression) and pushes
contacts into the Centerfy dialer + calling workflow via the GHL API v2.
First half of the MogulOS ↔ Centerfy bridge.

```bash
cd dialer && npm install && cp .env.example .env   # fill in Centerfy values
node src/cli.js prep --in leads.csv --out out/clean.csv --suppress dnc.txt
node src/cli.js push --in out/clean.csv --dry-run
```


### [website-downloader/](website-downloader/)

Downloads a complete website (HTML, CSS, JS, images) for offline use and
packages it as a zip, via a web UI. Vendored from
[AhmadIbrahiim/Website-downloader](https://github.com/AhmadIbrahiim/Website-downloader) (MIT).

```bash
cd website-downloader
npm install
npm start
# open http://localhost:3000
```

Note: for local use only — do not host it publicly as-is (the URL input is
passed to a shell command unsanitized).
