# Gimmeleads AI — Lovable Build Brief (+ GHL wiring)

Two parts:
1. **Lovable prompt** — paste into Lovable/Cowork to generate the site.
2. **GHL wiring** — makes the click-to-call form actually trigger an instant AI call.

The site can be built/deployed now. The live call still rides the same
Centerfy **outbound/KYC gate** — so click-to-call won't place real calls until
KYC clears (same gate as the dialer). Everything else works immediately.

---

## PART 1 — Paste this into Lovable

```
Build a bold, modern, conversion-focused marketing website for "Gimmeleads AI,"
an AI-powered lead-generation and voice-agent service for local businesses. The
signature feature is a CLICK-TO-CALL widget: a visitor enters their phone number
and our AI agent calls them within seconds — a live demo of the product itself.

GOAL: get visitors to either (a) trigger an instant AI call to experience the
product, or (b) book a demo. Every section drives toward one of those.

BRAND & TONE: confident, energetic, a little bold. Tagline vibe: "Your AI sales
team that never sleeps." Audience is busy local business owners (contractors,
dentists, salons, home services). Benefit-led, plain language, no jargon.

DESIGN — premium GOLD + CHROME on a BLACK background (Gimmeleads brand, elevated):
- Brand colors: true black #000000 base (near-black #0A0A0C for raised surfaces/
  cards), metallic gold #C9A227 (accent gradient #EBD07A -> #B8860B), chrome/silver
  (gradient #E6E9ED -> #9AA1AA -> #C7CCD1), supporting blue #2FA8E0 used sparingly,
  near-white #F5F6F8 text. NO bright yellow.
- Look: black background with brushed-metallic GOLD headings and CTA buttons (subtle
  gold gradient sheen), CHROME/silver hairline borders, dividers, and icon accents.
  Premium/luxe and modern — tasteful metallic sheen and thin chrome lines on black,
  NOT the old heavy plastic bevel. Big tight headlines (800 weight), generous
  spacing, rounded cards on near-black surfaces, subtle gold glow.
- Logo: a modern "Gimmeleads AI" wordmark in metallic gold with a fine chrome edge
  on navy (no heavy bevel). Small chat-bubble or spark mark optional.
- An animated audio-waveform motif (gold with a chrome shimmer) near the
  click-to-call widget to signal "voice." Fully responsive, fast, accessible.
  Modern sans-serif (Inter). React + TailwindCSS.

SECTIONS (single landing page):
1. Sticky nav: Gimmeleads AI logo, links (How it works, Features, Pricing, FAQ),
   and a "Get a call now" button that scrolls to the click-to-call widget.
2. HERO:
   - Headline: "Your AI agent calls, qualifies, and books your leads — in seconds."
   - Subhead: "Gimmeleads AI answers, follows up, and books appointments 24/7 so
     you never lose another lead to a missed call."
   - Centerpiece: the CLICK-TO-CALL widget (spec below).
   - Secondary button: "Book a demo."
   - Animated waveform + a small "live" pulse dot.
3. TRUST STRIP: "Trusted by local businesses" with a row of placeholder
   industry/logo chips.
4. HOW IT WORKS (3 steps): 1) Drop your number  2) Our AI calls you in seconds
   3) It qualifies and books the meeting — see it live.
5. FEATURES grid (6 cards): Instant callback (speed-to-lead); Natural voice
   conversations; Lead qualification; Books appointments; Email + SMS follow-up;
   CRM sync & transcripts.
6. LIVE DEMO section: "Don't take our word for it — let it call you." Repeat the
   click-to-call widget here, plus an example chat-bubble transcript UI showing a
   short qualifying + booking exchange.
7. RESULTS band (3 stats): "24/7 coverage", "Responds in < 60 seconds",
   "Never misses a lead".
8. TESTIMONIALS: 3 placeholder quotes attributed to role + industry (e.g.
   "Owner, home-services company"), clearly swappable. Add an HTML comment to
   replace with real testimonials before launch.
9. PRICING: 3 placeholder tiers (Starter / Growth / Agency-custom) with a note
   that pricing is placeholder.
10. FAQ accordion: Does it sound human? Can it use my number? What happens when
    someone's interested? Is it compliant? How fast can we launch?
11. FINAL CTA band: "Ready to never miss a lead?" + "Get a call now" button.
12. Footer: logo, nav links, "© Gimmeleads AI — a Postema Media Management
    company", and Privacy Policy + Terms links (create placeholder routes).

CLICK-TO-CALL WIDGET (hero centerpiece + repeated in Live Demo):
- Fields: First name; Phone number (required); Business name (optional).
- A REQUIRED consent checkbox, UNCHECKED by default, with this exact text shown
  next to the submit button:
  "By checking this box, I agree that Postema Media Management, including its
  brand Gimmeleads, and its affiliates may contact me at the number provided by
  phone call and text message — including calls that are automated, use
  pre-recorded messages, or use an AI-generated voice — for marketing purposes.
  Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP
  to opt out. See Privacy Policy and Terms."
- Primary button: "Call me now". On submit, POST the form as JSON to a
  configurable webhook URL. Put that URL in a clearly-marked config constant at
  the TOP of the app named GHL_INBOUND_WEBHOOK_URL (do not hardcode secrets).
- JSON body: { firstName, phone, business, email, consent: true, channel: "call",
  source: "gimmeleads-site" }.
- Success state: an animated "Calling you now — pick up!" panel with the waveform
  moving, echoing the number entered.
- Validation: require a valid phone and the consent checkbox before submitting.
- ALTERNATE "click-to-email": a small "Prefer email?" toggle revealing an email
  field; submitting POSTs the same endpoint with channel: "email".

TECH NOTES:
- Single-page React, TailwindCSS, mobile-first, no external calls except the form
  POST. Keep all editable copy + the webhook URL in a config object at the top so
  it's easy to change. Include Privacy Policy and Terms placeholder pages.
- Consent checkbox must be active opt-in (unchecked by default).
```

---

## PART 2 — GHL wiring (instant AI callback from the form)

Do this in the **Gimmeleads AI** sub-account so the site form triggers the PMM agent.

1. **New workflow** (e.g. "Web Click-to-Call") → add trigger **Inbound Webhook**.
   - This trigger needs a **Mapping Reference**: it shows a capture URL — submit
     one test form from the Lovable site (or POST a sample JSON) so GHL captures
     the fields and lets you map them. (This is the step that errored before when
     it had no sample; for click-to-call we set it up properly with a sample.)
2. **Map fields** from the payload → create/update contact: `firstName`, `phone`,
   `business`, `email`; set your consent/opt-in field true; add tag
   `gimmeleads-web-call`.
3. **Branch on `channel`:**
   - `call` → action **Voice AI Outbound Call** (agent: PMM Outbound; from:
     +1 419 518 5829) = instant callback.
   - `email` → action **Send Email** (AI-written or template) instead of calling.
4. **Copy the Inbound Webhook URL** from the trigger → paste it into the Lovable
   site's `GHL_INBOUND_WEBHOOK_URL` config. That's the whole connection.
5. **Publish.** (Live calls still require the outbound/KYC gate to be cleared —
   same as the dialer.)

## Notes
- Consent responsible party = **Postema Media Management** (Gimmeleads named as
  its brand) to stay aligned with KYC + what the AI says on the call.
- Same PMM agent, same calling engine — this is the dialer's inbound twin.
- Full multi-tenant SaaS wrapper (client logins/billing) is still Phase 2.
