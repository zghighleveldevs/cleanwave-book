# CleanWave KC — Walkthrough Funnel

A standalone 3-step funnel for CleanWave KC that turns ad and search traffic into booked on-site walkthroughs.

| Step | File | URL (Vercel) |
|---|---|---|
| 1. Landing page + 3-step quote form | `index.html` | `/` |
| 2. Booking calendar (live GoHighLevel widget) | `book.html` | `/book` |
| 3. Thank you / confirmation | `thank-you.html` | `/thank-you` |

Static HTML, CSS and vanilla JS: no build step. Form logic, the FAQ accordion and the scroll-reveal fallback live in `funnel.js`.

## How the flow works
1. Visitor answers the quote form (facility, frequency, size, current cleaner, start date, ZIP, contact details).
   Residential leads are filtered out with a polite "we serve businesses only" screen.
2. On submit, the visitor goes to `/book` with their name, email, phone and company in the URL, so the GHL calendar is pre-filled.
3. After booking, GHL redirects to `/thank-you`.

## Setup in GoHighLevel
1. **Capture form answers in GHL** — create a workflow with an *Inbound Webhook* trigger, copy its URL and paste it into
   `GHL_WEBHOOK_URL` at the top of `funnel.js`. Each submission posts all answers, SMS consent and UTM/GCLID params.
2. **Calendar redirect** — Calendar settings → Form/Confirmation → *Redirect URL* →
   `https://YOUR-DOMAIN/thank-you?first_name={{contact.first_name}}&company_name={{contact.company_name}}`
   (the thank-you page also reads `appointment_date`, `appointment_time` and `address` if you add them).
3. **Calendar colours** — set the widget's primary colour to `#1A64D6` so it matches the page.

## Before going live
- Replace the placeholder phone `(816) 000-0000`
- Replace the testimonial placeholders in `index.html`
- Point ads at `/` and keep UTM parameters on the URL

## Deploying on Vercel
Import this repo at vercel.com/new. Framework preset: **Other**. Leave the build command and output directory empty.
