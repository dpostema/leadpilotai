# LeadPilot AI

## Tools

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
