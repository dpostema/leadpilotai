# Consent Language (for outbound Voice AI / KYC)

Centerfy/GHL requires your **data-collection channels** (lead forms, landing
pages — anywhere you capture phone numbers) to carry consent language covering:
texts **and** calls, an automated/pre-recorded/AI-voice disclosure, marketing
consent, and an opt-out method. This is what unlocks outbound Voice AI once KYC
is complete.

## Name alignment (important)
Keep these four the same so KYC isn't rejected and recipients recognize the call:
- **Legal caller / KYC entity:** Postema Media Management (the registered legal entity)
- **Consent responsible party:** Postema Media Management (its brand Gimmeleads named under it)
- **What the AI says on the call:** "Postema Media Management"
- The sub-account may be *named* "Gimmeleads AI" — that's fine; KYC verifies the real legal business behind it.

## Consent block (paste on lead-capture forms — active checkbox, not pre-checked)

> By providing your phone number and checking this box, you agree that Postema
> Media Management, including its brand Gimmeleads, and its affiliates may
> contact you at the number provided by text message and phone call — including
> calls that are automated, use pre-recorded messages, or use an artificial or
> AI-generated voice — for marketing, promotional, and informational purposes.
>
> You understand these communications may be delivered using automated
> technology, and that consent is not a condition of purchasing any goods or
> services. Message and data rates may apply, and message frequency may vary.
>
> You may opt out at any time: reply STOP to any text to stop messages, tell our
> representative or AI assistant on a call that you wish to be removed, or email
> [opt-out email] to join our do-not-contact list. Reply HELP for help. See our
> Privacy Policy and Terms at [link].

Fill in `[opt-out email]` and `[link]`. ~910 characters.

## Notes
- Not legal advice — have your attorney confirm it meets your state's rules.
- Opt-outs the AI captures on a call should flow back to a do-not-contact tag and
  into the `dialer prep --suppress` list so those numbers are never dialed again.
