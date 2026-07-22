# LeadPilot AI — Landing Site

Self-contained marketing landing page for the LeadPilot AI outbound-caller
product (a MogulOS product). Single `index.html`, no build step, no external
assets — inline CSS/JS, responsive, light/dark aware.

## Preview / deploy

Open `index.html` in a browser, or host it anywhere static (Netlify, Vercel,
GHL/MogulOS Sites, S3, GitHub Pages).

## Before you go live — swap in the real bits

- **Book-a-demo buttons** — the "Book my demo" CTA currently shows a placeholder
  alert. Point the `#book` buttons at your MogulOS/Centerfy booking calendar URL.
- **"Hear a call" demo** — the hero call card is an animated mock. Replace it with
  your real Centerfy/GHL voice widget embed when ready.
- **Testimonials** — the three quotes are clearly-marked placeholders (role +
  industry, no real names). Swap in real customer quotes.
- **Pricing** — the $297 / $697 / Custom tiers are placeholders. Set your real
  plans (and wire them to MogulOS SaaS checkout).
- **Brand** — colors live in the `:root` CSS variables at the top; the logo is an
  inline SVG in the nav + footer.

Everything else (copy, structure, sections) is original LeadPilot content.
