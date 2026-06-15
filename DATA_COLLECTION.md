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

## Ad pixel events

Both Meta Pixel and TikTok Pixel fire the same conceptual events using each platform's standard event names. Each pixel activates independently when its env var is set; either can run alone.

| Trigger | Meta event | TikTok event |
|---|---|---|
| Every page load | `PageView` (automatic) | `page` (automatic) |
| EmailModal submit (PDF or course card) | `Lead` | `Subscribe` |
| CourseModal submit (navbar) | `Lead` | `Subscribe` |
| Calculator fully submitted | `CompleteRegistration` | `CompleteRegistration` |

These power retargeting and lookalike audiences in Meta Ads Manager and TikTok Ads Manager respectively.

---

## Google Analytics (GA4)

Once `NEXT_PUBLIC_GA_ID` is set, GA4 receives data in three layers:

**Automatic (Enhanced Measurement):** page views, sessions, traffic source, scroll-depth (90%), outbound clicks, file downloads on real `.pdf` URLs, video engagement, site search.

**Conversion events fired by our code** via `fireConversionEvent` (`lib/pixel.ts`), same triggers that drive Meta + TikTok:

| Trigger | GA4 event | Params |
|---|---|---|
| EmailModal submit (PDF or course card) | `generate_lead` | `content_name`, `content_category` |
| CourseModal submit (navbar) | `generate_lead` | `content_name`, `content_category` |
| Calculator fully submitted | `calculator_complete` | `content_name`, `goal`, `calories` |

Both are marked as **Key Events** in the GA4 UI so they appear in Conversion reports and can be used for Google Ads bid optimization.

**Why GA4 in addition to Supabase?**

Supabase is the **system of record** — every row, exact, forever, queryable via SQL. GA4 is the **analytics layer** — pre-built attribution, marketing integrations, fast exploration. They complement each other:

- **Multi-touch attribution out of the box** — Supabase stores first/last-touch UTMs; GA4 runs data-driven, linear, time-decay, and position-based models without writing SQL.
- **Audience segmentation in the UI** — build cohorts (e.g. "users who completed the calculator but didn't download a guide") visually instead of via SQL.
- **Funnel & path exploration** — drag-and-drop in GA4 Explore vs. writing custom views in Supabase.
- **Google Ads bid optimization** — Google can only optimize ad spend for conversions it knows about. Conversions imported from GA4 → Google Ads let smart bidding target real leads, not pageviews.
- **Predictive metrics** — purchase / churn probability and demographics enrichment for free.
- **Realtime monitoring + Looker Studio dashboards** — share with stakeholders without giving them DB access.
- **Industry benchmarking** — comparison to similar fitness/health sites.

GA4 limitations (handled by Supabase): aggregated/sampled data, max 14-month retention on free tier, no arbitrary SQL, can't join to your own tables. Anything requiring per-user history beyond what GA4 exposes — e.g. "show me all calculator submissions by this email, with the original UTM that brought them" — still has to come from Supabase.

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
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Pixel (blank = disabled) |

---

## What we deliberately do NOT collect

- Passwords or payment info (no payments on the site)
- Cross-site fingerprinting beyond standard Meta/GA
- Email contents or message logs (WhatsApp outreach is manual)

The Supabase anon key is write-only by RLS policy — no one can read the data via the public API.
