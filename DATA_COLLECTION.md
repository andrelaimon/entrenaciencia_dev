# Data Collection Strategy — Entrena con Ciencia

## Identity model

Three identifiers are attached to every event and form submission:

| ID | Storage | Lifetime | Purpose |
|---|---|---|---|
| `anonymous_id` | localStorage | Persistent (until user clears storage) | Identifies a unique device across all visits and conversions |
| `session_id` | localStorage | Rotates after 30 min of inactivity | Groups events within one continuous browsing session |
| `wizard_session_id` | React `useRef` | Lives only while the calculator wizard is mounted | Specific to a single calculator wizard run |

The anonymous_id is the key that ties everything together — it's how you tell that the person who visited last Tuesday and the person who downloaded a guide today are the same human.

---

## Attribution model

Two parallel sets of UTM parameters are stored on every event:

| Set | Stored in | Behavior |
|---|---|---|
| `utm_*` (last-touch) | sessionStorage | Overwritten every time the user lands on a URL with new UTMs |
| `first_touch_utm_*` | localStorage | Set once on the user's very first visit, never overwritten |

This lets you measure both **what brought them initially** (first-touch) and **what they were doing when they converted** (last-touch). If a user discovers you via Instagram and converts a week later via a Google search, first-touch credits Instagram, last-touch credits Google.

---

## Tables

### `page_views`
**Purpose:** Top-of-funnel visibility. Every page load is logged.

Captures: anonymous_id, session_id, path, referrer, user_agent, country (from Vercel geo headers), both UTM sets.

This is what gives you a denominator for conversion rate. Without it, you'd only see conversions, never visitors.

### `leads`
**Purpose:** Master contact list. Every form submission ends up here.

Sources:
- `Pierde Grasa con Ciencia` — weight loss PDF download
- `Proteína con Ciencia` — protein PDF download
- `Curso` — course waitlist signup
- `Calculadora` — completed calculator

Plus contact info, survey responses, identity, and full attribution.

### `calculator_submissions`
**Purpose:** Full detail record for every completed calculator run.

Includes inputs (sex, age, weight, height, body fat, activity), results (BMR, TDEE, calories, calorie_bracket, macros), obstacle, screening flags, identity, attribution.

### `calculator_sessions`
**Purpose:** Funnel drop-off tracking. Captures abandoned calculator runs via `sendBeacon` on page unload.

Tells you what step they reached, how long they spent, what flags/goals they had selected before leaving.

### `resource_events`
**Purpose:** Click-to-submit conversion per resource card.

`event_type='modal_open'` is logged when a card is clicked. `event_type='form_submit'` is logged when the form is submitted. The ratio gives you per-resource conversion.

---

## Meta Pixel events

Once `NEXT_PUBLIC_META_PIXEL_ID` is set:

| Event | Trigger | Purpose |
|---|---|---|
| `PageView` | Every page load (automatic) | Baseline audience |
| `Lead` | EmailModal submit (PDF or course) | Retargeting audience of interested users |
| `Lead` | CourseModal submit | Same |
| `CompleteRegistration` | Calculator fully submitted | High-intent audience |

---

## Google Analytics

Once `NEXT_PUBLIC_GA_ID` is set, GA4 tracks page views, sessions, and traffic source automatically.

---

## Views for analysis

| View | Tells you |
|---|---|
| `unified_contacts` | One row per email — all touchpoints, sources, first/last UTM |
| `visitor_journeys` | One row per anonymous_id — first visit, sessions, country, conversion status |
| `calculator_funnel` | Drop-off count at each step vs. completions |
| `resource_conversion` | Click-to-submit % per resource card |
| `conversion_by_source` | Visitor count vs. lead count grouped by first-touch UTM source |

---

## Environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Database (write-only via RLS) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 (blank = disabled) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (blank = disabled) |

---

## What we deliberately do NOT collect

- Passwords or payment info (no payments on the site)
- Cross-site fingerprinting beyond standard Meta/GA
- Email contents or message logs (WhatsApp outreach is manual)

The Supabase anon key is write-only by RLS policy — no one can read the data via the public API.
