# Data Collection — Future Improvements

This document tracks tracking work that has been scoped but not yet implemented. Tier 1 (anonymous device ID, page views, first-touch UTMs) is already live — see `DATA_COLLECTION.md`.

These tiers are listed in priority order. Implement Tier 2 once Tier 1 has been observed for 2–4 weeks and the value is confirmed; Tier 3 and 4 should wait until volume justifies the additional complexity.

---

## Tier 2 — Behavioral signals on the page

Goal: understand engagement, not just conversion. Why people drop off, which messaging resonates, where attention lands.

### 2.1 — Generic events table

A single high-density events table that absorbs any UI interaction without requiring schema changes for each new event type.

```sql
create table events (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  anonymous_id text not null,
  session_id   text not null,
  event_name   text not null,         -- snake_case: 'hero_cta_click', 'section_visible', etc.
  properties   jsonb,                 -- arbitrary structured data per event
  path         text                   -- page where the event fired
);

alter table events enable row level security;
create policy "allow public insert" on events for insert to public with check (true);
grant insert on events to public;

create index events_anonymous_id_idx on events (anonymous_id);
create index events_event_name_idx   on events (event_name);
create index events_created_at_idx   on events (created_at desc);
```

Implementation:
- Create `lib/events.ts` with a `trackEvent(name, properties?)` helper
- Create `app/api/events/route.ts` that inserts into the events table
- Use `navigator.sendBeacon` for fire-and-forget sends so they don't block UI

### 2.2 — Specific events to fire

| Event name | Trigger | Properties |
|---|---|---|
| `hero_cta_click` | Either hero CTA clicked | `{ button: 'recursos_gratis' \| 'nuestro_curso' }` |
| `section_visible` | Homepage section enters viewport (IntersectionObserver) | `{ section: 'hero' \| 'why' \| 'pillars' \| 'closer' \| 'recursos' \| 'contacto' }` |
| `modal_close_no_submit` | EmailModal or CourseModal closed without submitting | `{ modal: 'email' \| 'course', resource_title?: string, time_open_seconds: number }` |
| `calculator_step_advance` | User clicks "Continuar" in calculator | `{ from: 'intro' \| 'screening' \| 'form', to: '...', time_on_step_seconds: number }` |
| `calculator_step_back` | User clicks "Atrás" in calculator | same shape |
| `form_validation_error` | Any form shows a validation message | `{ form: 'email_modal' \| 'course_modal' \| 'calculator', field: string, error: string }` |
| `social_link_click` | Footer social icon clicked | `{ platform: 'instagram' \| 'tiktok' }` |

### 2.3 — Scroll depth on the homepage

Combined with `section_visible`, this answers "how far down the page do most people get?" A simple implementation:

- Track 25/50/75/100% scroll milestones with a single IntersectionObserver on a hidden marker per quartile
- Fire `scroll_depth` event with `{ depth: 25 | 50 | 75 | 100 }` once per session per milestone

### 2.4 — Suggested view

```sql
create view section_engagement as
select
  properties->>'section' as section,
  count(distinct anonymous_id) as unique_viewers,
  count(*) as total_views
from events
where event_name = 'section_visible'
group by 1
order by unique_viewers desc;
```

---

## Tier 3 — Quality and context

Goal: filter out noise, distinguish high-quality traffic, enrich conversions with their journey.

### 3.1 — Country from IP on every insert

The `page_views` table already captures country via the `x-vercel-ip-country` header. Extend this to every API route (`/api/subscribe`, `/api/calculator-submit`, `/api/calculator-sessions`, `/api/resource-events`, future `/api/events`) by reading the same header server-side and storing it on every row.

Add `country text` column to: `leads`, `calculator_submissions`, `calculator_sessions`, `resource_events`, `events`.

### 3.2 — Session quality columns on `page_views`

Add a daily Supabase scheduled function (or a view) that computes per session:
- `pages_per_session`
- `time_on_site_seconds` (max - min created_at)
- `bounce` (boolean — single page, <10s)

```sql
create view session_summary as
select
  anonymous_id,
  session_id,
  min(created_at) as session_start,
  max(created_at) as session_end,
  extract(epoch from (max(created_at) - min(created_at))) as duration_seconds,
  count(*) as page_views,
  (count(*) = 1 and extract(epoch from (max(created_at) - min(created_at))) < 10) as bounced
from page_views
group by anonymous_id, session_id;
```

### 3.3 — Conversion-side enrichment

When inserting into `leads` or `calculator_submissions`, also compute and store:
- `prior_page_views` — how many page views did this anonymous_id have before this conversion?
- `days_since_first_visit` — gap between first page view and conversion
- `prior_resource_interactions` — count of `resource_events` rows for this anonymous_id before now

These let you separate first-visit converters from nurtured converters.

```sql
-- In API routes, before insert:
const { count: priorViews } = await supabase
  .from('page_views')
  .select('*', { count: 'exact', head: true })
  .eq('anonymous_id', anonymousId);

const { data: firstView } = await supabase
  .from('page_views')
  .select('created_at')
  .eq('anonymous_id', anonymousId)
  .order('created_at', { ascending: true })
  .limit(1)
  .single();
```

Add columns: `prior_page_views int`, `days_since_first_visit int`, `prior_resource_interactions int`.

### 3.4 — Engagement score

Optional derived metric. Per anonymous_id:
```
engagement_score = (page_views × 1) + (sections_seen × 2) + (modals_opened × 5) + (calculator_started × 10)
```

High-engagement non-converters are your best retargeting audience. Compute as a view, refresh weekly.

---

## Tier 4 — Form-level diagnostics

Goal: pinpoint exactly which form fields cause friction. Only worth implementing once you have meaningful calculator volume (>500 submissions/month) — otherwise the noise:signal ratio is too high.

### 4.1 — Field interaction tracking

For the calculator's form step (the longest, most complex form on the site), instrument every field with:

```ts
onFocus={() => trackEvent('field_focus', { form: 'calculator', field: 'age' })}
onBlur={() => trackEvent('field_blur', {
  form: 'calculator',
  field: 'age',
  filled: form.age !== '',
  time_to_first_keystroke_ms: ...
})}
```

Properties to capture per field:
- Time-to-first-keystroke (focus → first keypress)
- Time spent in field (focus → blur)
- Whether the field was left empty
- How many validation errors fired on this field

### 4.2 — Goal/option exploration

In the goal selection step, log every selection change (not just final pick):

```ts
const handleGoalSelect = (goal: Goal) => {
  trackEvent('option_explored', {
    form: 'calculator',
    field: 'goal',
    value: goal,
    is_final: false,
  });
  update('goal', goal);
};
```

This tells you which goals users hover/consider before committing — useful for tuning copy.

### 4.3 — Suggested view

```sql
create view form_field_friction as
select
  properties->>'field' as field,
  count(*) as touches,
  count(*) filter (where (properties->>'filled')::boolean = false) as left_empty,
  round(avg((properties->>'time_to_first_keystroke_ms')::int)) as avg_time_to_first_keystroke_ms
from events
where event_name = 'field_blur' and properties->>'form' = 'calculator'
group by 1
order by left_empty desc;
```

---

## Things explicitly NOT planned

- **Session replay (Hotjar/FullStory)** — privacy implications outweigh the value at this stage
- **Heatmaps** — the events log gives equivalent insight at a fraction of the cost and complexity
- **Server-side email validation on submit** — adds friction; only worth it if spam becomes a real problem
- **A/B testing framework** — premature; volume is too low to detect meaningful lifts

---

## Privacy considerations going forward

Each tier adds data, which adds compliance surface area:
- Mexican LFPDPPP: requires a published privacy policy mentioning what's collected and why — currently the footer "Privacidad" link points to `#`. This becomes a real obligation once volume grows.
- GDPR: only relevant if you target or attract EU traffic. If you do, a cookie consent banner becomes required for the analytics + Pixel scripts.
- The Supabase anon key remains write-only via RLS, so even if exposed, no one can read collected data.

Before implementing Tier 4, audit what's actually needed — granular form tracking captures more than is strictly necessary and may push you toward needing explicit consent.
