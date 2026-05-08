@AGENTS.md

## Project context

Entrena con Ciencia — a Next.js 16 landing site (Spanish) with a calorie calculator and a lead capture flow for free resources.

The site captures leads via three flows:
- **Resource modals** (PDF guides) → `/api/subscribe` → Supabase `leads`
- **Course signup modal** with survey (navbar + Curso card) → `/api/subscribe` → Supabase `leads`
- **Calculator wizard** → `/api/calculator-submit` → `calculator_submissions` + `leads`

PDFs are not served from the site — leads receive resources by email manually (for now).

## Key documents
| File | What it covers |
|---|---|
| `notes.md` | Original lead capture implementation and Supabase RLS notes |
| `DATA_COLLECTION.md` | Active data collection strategy (identity, attribution, tables, pixels) |
| `data_collection_todo.MD` | Documented future work for Tier 2/3/4 collection |
| `supabase-schema.sql` | Complete database schema — run in Supabase SQL Editor |

---

## Pending work (prioritized)

### 🔴 Critical setup before site is fully functional
- [ ] **Run `supabase-schema.sql`** in Supabase SQL Editor — creates 5 tables (`page_views`, `leads`, `calculator_submissions`, `calculator_sessions`, `resource_events`) + 5 analytical views
- [ ] **Set required Vercel env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` — without these, every form submission errors out
- [ ] **(Optional) Set ad pixel env vars** — leave blank to disable each:
  - `NEXT_PUBLIC_GA_ID` — Google Analytics 4
  - `NEXT_PUBLIC_META_PIXEL_ID` — Meta Pixel
  - `NEXT_PUBLIC_TIKTOK_PIXEL_ID` — TikTok Pixel

### 🟠 Email + automation (the biggest functional gap)
- [ ] **Klaviyo integration** — `app/api/calculator-submit/route.ts` has a TODO for forwarding leads to Klaviyo with the obstacle-mapped email flow (Email A → food table, B → 3-step plan, C → quick meal prep, D → Dr. León note, E → generic)
- [ ] **Email sending** — currently zero emails go out anywhere on the site; users see "te enviaremos por email" but nothing fires. Resend, Postmark, or Klaviyo's transactional send would close this
- [ ] **PDF delivery automation** — currently manual per `notes.md`. Should auto-attach the right PDF based on `source` field
- [ ] **WhatsApp follow-up automation** — numbers are captured but not contacted; Twilio or WhatsApp Business API would close the loop

### 🟡 Compliance + content gaps
- [ ] **Privacy policy page** — footer "Privacidad" link points to `#`. Required by Mexican LFPDPPP given the data captured (name, email, WhatsApp, health screening flags)
- [ ] **Terms of service page** — footer "Términos" link is also `#`
- [ ] **"Quiénes somos" navbar link** — currently `#`; needs an About page or replace with anchor to the Pillars section
- [ ] **Contact email mailbox** — `hola@entrenaconciencia.com` is hardcoded in old footer code paths but no actual mailbox is confirmed
- [ ] **Mobile QA** — the redesigned homepage's "Why" section (evidence paper + guru cards mockup) has a complex absolute-positioned layout that needs a real mobile pass

### 🟢 Tier 2/3/4 data collection
See `data_collection_todo.MD` for full SQL and code patterns. Implement Tier 2 only after observing Tier 1 for 2–4 weeks.

- [ ] Tier 2: generic `events` table + behavioral signals (CTA clicks, section visibility, modal closes, calculator step transitions, scroll depth, validation errors)
- [ ] Tier 3: country on every conversion, session quality (bounce/duration), conversion-side enrichment (`prior_page_views`, `days_since_first_visit`, `prior_resource_interactions`), engagement scoring
- [ ] Tier 4: form-level diagnostics (time-to-first-keystroke per field, abandonment per field, option exploration tracking)

### 🔵 Polish (low priority)
- [ ] Re-attempt scroll-reveal/staggered card entrance animations — we reverted these earlier when they didn't render visibly, but the underlying issue was likely the same CSS cascade bug we later fixed in the calculator (`* { margin: 0; padding: 0 }` not in `@layer base`). Worth retrying now
- [ ] Active nav link highlighting as the user scrolls through sections
- [ ] Cursor-following soft glow on dark sections
- [ ] Newsletter / email signup beyond resource downloads (currently no general subscribe)

---

## Architecture cheat sheet

**Identity & attribution helpers** (`lib/`)
- `identity.ts` — `getAnonymousId()` (persistent UUID), `getSessionId()` (30-min idle rotation)
- `utm.ts` — `captureUtm()`, `getStoredUtm()`, `getFirstTouchUtm()`, `getAllAttribution()`
- `tracking.ts` — `getTrackingContext()` returns `{ anonymous_id, session_id, ...all UTM fields }`
- `pixel.ts` — `fireConversionEvent(metaEvent, tiktokEvent, data)` fires both ad pixels

**Always pass `getTrackingContext()` into every form/event API call.** This auto-includes anonymous_id, session_id, and both first-touch + last-touch UTM sets.

**Always use `fireConversionEvent`** when a meaningful conversion happens — never call `fbq` or `ttq` directly. The function no-ops gracefully when pixels haven't loaded.
