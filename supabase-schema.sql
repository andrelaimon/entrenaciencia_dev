-- ================================================================
-- Entrena con Ciencia — Complete Database Schema
-- Run this in the Supabase SQL Editor to set up from scratch.
-- ================================================================
--
-- Key concepts:
--   • anonymous_id           — persistent per-device UUID (localStorage)
--   • session_id             — analytics session, rotates after 30 min idle
--   • wizard_session_id      — calculator-specific session, generated when wizard mounts
--   • utm_*                  — last-touch attribution (current session)
--   • first_touch_utm_*      — first-touch attribution (set once, never overwritten)
-- ================================================================


-- ── 1. PAGE VIEWS ───────────────────────────────────────────────
-- Logged on every route change via the Analytics client component.

create table page_views (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz default now(),

  anonymous_id             text not null,
  session_id               text,

  path                     text not null,
  referrer                 text,
  user_agent               text,
  country                  text,                -- from x-vercel-ip-country header

  -- Last-touch attribution
  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  utm_content              text,
  utm_term                 text,

  -- First-touch attribution
  first_touch_utm_source   text,
  first_touch_utm_medium   text,
  first_touch_utm_campaign text,
  first_touch_utm_content  text,
  first_touch_utm_term     text
);

alter table page_views enable row level security;

create policy "allow public insert" on page_views
  for insert to public with check (true);

grant insert on page_views to public;

create index page_views_anonymous_id_idx on page_views (anonymous_id);
create index page_views_session_id_idx   on page_views (session_id);
create index page_views_path_idx         on page_views (path);
create index page_views_country_idx      on page_views (country);
create index page_views_created_at_idx   on page_views (created_at desc);


-- ── 2. LEADS ────────────────────────────────────────────────────
-- Master contact list. Every form submission lands here.

create table leads (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz default now(),

  name                     text,
  email                    text not null,
  whatsapp                 text,
  whatsapp_country_code    text,

  source                   text,           -- 'Pierde Grasa con Ciencia' | 'Proteína con Ciencia' | 'Curso' | 'Calculadora'
  survey                   jsonb,

  anonymous_id             text,
  session_id               text,

  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  utm_content              text,
  utm_term                 text,
  first_touch_utm_source   text,
  first_touch_utm_medium   text,
  first_touch_utm_campaign text,
  first_touch_utm_content  text,
  first_touch_utm_term     text
);

alter table leads enable row level security;

create policy "allow public insert" on leads
  for insert to public with check (true);

grant insert on leads to public;

create index leads_email_idx        on leads (email);
create index leads_anonymous_id_idx on leads (anonymous_id);
create index leads_source_idx       on leads (source);
create index leads_created_at_idx   on leads (created_at desc);


-- ── 3. CALCULATOR SUBMISSIONS ───────────────────────────────────

create table calculator_submissions (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz default now(),

  -- Contact
  name                     text,
  email                    text not null,

  -- Inputs
  units                    text,
  sex                      text,
  age                      int,
  weight_kg                numeric,
  height_cm                numeric,
  body_fat_pct             numeric,  -- deprecated: no longer collected (kept for historical rows)

  activity_level           numeric,
  goal                     text,
  macro_split              text,     -- 'balanced' | 'low_fat' | 'low_carb'

  -- Results
  bmr                      int,
  tdee                     int,
  calories                 int,
  calorie_bracket          text,
  protein_g                int,
  carbs_g                  int,
  fat_g                    int,
  warnings                 text[],   -- e.g. {'deficit_limitado','supervision_medica'}

  obstacle                 text,

  -- Screening flags
  flag_medical             boolean default false,
  flag_medications         boolean default false,
  flag_weight_change       boolean default false,
  flag_eating_control      boolean default false,
  flag_pregnancy_lactation boolean default false,
  flag_restrictive_diet    boolean default false,
  disclaimer_accepted      boolean default false,

  -- Identity & attribution
  anonymous_id             text,
  session_id               text,

  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  utm_content              text,
  utm_term                 text,
  first_touch_utm_source   text,
  first_touch_utm_medium   text,
  first_touch_utm_campaign text,
  first_touch_utm_content  text,
  first_touch_utm_term     text
);

alter table calculator_submissions enable row level security;

create policy "allow public insert" on calculator_submissions
  for insert to public with check (true);

grant insert on calculator_submissions to public;

create index calc_sub_email_idx        on calculator_submissions (email);
create index calc_sub_anonymous_id_idx on calculator_submissions (anonymous_id);
create index calc_sub_goal_idx         on calculator_submissions (goal);
create index calc_sub_bracket_idx      on calculator_submissions (calorie_bracket);
create index calc_sub_created_at_idx   on calculator_submissions (created_at desc);


-- ── 4. CALCULATOR SESSIONS ──────────────────────────────────────
-- Abandoned calculator sessions, captured via sendBeacon on page unload.

create table calculator_sessions (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz default now(),
  wizard_session_id        text not null unique,

  step_reached             text not null,
  time_on_page_seconds     int,

  email                    text,
  goal_selected            text,
  obstacle_selected        text,

  flag_medical             boolean default false,
  flag_medications         boolean default false,
  flag_weight_change       boolean default false,
  flag_eating_control      boolean default false,
  flag_pregnancy_lactation boolean default false,
  flag_restrictive_diet    boolean default false,

  -- Identity & attribution
  anonymous_id             text,
  session_id               text,

  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  utm_content              text,
  utm_term                 text,
  first_touch_utm_source   text,
  first_touch_utm_medium   text,
  first_touch_utm_campaign text,
  first_touch_utm_content  text,
  first_touch_utm_term     text
);

alter table calculator_sessions enable row level security;

create policy "allow public insert" on calculator_sessions
  for insert to public with check (true);

grant insert on calculator_sessions to public;

create index calc_sessions_anonymous_id_idx on calculator_sessions (anonymous_id);
create index calc_sessions_step_idx         on calculator_sessions (step_reached);
create index calc_sessions_created_at_idx   on calculator_sessions (created_at desc);


-- ── 5. RESOURCE EVENTS ──────────────────────────────────────────
-- Modal opens (clicks) + form submits per resource card.

create table resource_events (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz default now(),

  event_type               text not null,    -- 'modal_open' | 'form_submit'
  resource_title           text,
  resource_kind            text,

  name                     text,
  email                    text,

  -- Identity & attribution
  anonymous_id             text,
  session_id               text,

  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  utm_content              text,
  utm_term                 text,
  first_touch_utm_source   text,
  first_touch_utm_medium   text,
  first_touch_utm_campaign text,
  first_touch_utm_content  text,
  first_touch_utm_term     text
);

alter table resource_events enable row level security;

create policy "allow public insert" on resource_events
  for insert to public with check (true);

grant insert on resource_events to public;

create index resource_events_anonymous_id_idx on resource_events (anonymous_id);
create index resource_events_type_idx         on resource_events (event_type);
create index resource_events_title_idx        on resource_events (resource_title);
create index resource_events_created_at_idx   on resource_events (created_at desc);


-- ================================================================
-- VIEWS
-- ================================================================

-- Unified contact: one row per email, all touchpoints aggregated
create view unified_contacts as
select
  email,
  max(name)                                                as name,
  min(created_at)                                          as first_seen,
  max(created_at)                                          as last_seen,
  count(*)                                                 as total_touchpoints,
  array_agg(distinct source order by source)
    filter (where source is not null)                      as sources,
  bool_or(source = 'Calculadora')                          as used_calculator,
  max(anonymous_id)                                        as anonymous_id,
  max(utm_source)                                          as last_utm_source,
  max(utm_campaign)                                        as last_utm_campaign,
  max(first_touch_utm_source)                              as first_utm_source,
  max(first_touch_utm_campaign)                            as first_utm_campaign
from leads
group by email;

-- Visitor journey: per anonymous_id, summarizes how they came in and what they did
create view visitor_journeys as
with first_pv as (
  select distinct on (anonymous_id)
    anonymous_id,
    created_at as first_visit,
    referrer   as first_referrer,
    country,
    first_touch_utm_source,
    first_touch_utm_campaign
  from page_views
  order by anonymous_id, created_at asc
),
agg as (
  select
    anonymous_id,
    count(*)                              as page_view_count,
    count(distinct session_id)            as session_count,
    max(created_at)                       as last_seen
  from page_views
  group by anonymous_id
)
select
  agg.anonymous_id,
  fpv.first_visit,
  agg.last_seen,
  agg.session_count,
  agg.page_view_count,
  fpv.first_referrer,
  fpv.country,
  fpv.first_touch_utm_source,
  fpv.first_touch_utm_campaign,
  exists (select 1 from leads l where l.anonymous_id = agg.anonymous_id) as converted
from agg
join first_pv fpv on fpv.anonymous_id = agg.anonymous_id;

-- Calculator funnel: sessions abandoned at each step + completions
create view calculator_funnel as
select
  step_reached,
  count(*)                                  as abandoned,
  round(avg(time_on_page_seconds))          as avg_time_s
from calculator_sessions
group by step_reached
union all
select
  'completed'                               as step_reached,
  count(*)                                  as abandoned,
  null
from calculator_submissions;

-- Resource conversion: click-to-submit % per resource
create view resource_conversion as
select
  resource_title,
  resource_kind,
  count(*) filter (where event_type = 'modal_open')   as modal_opens,
  count(*) filter (where event_type = 'form_submit')  as form_submits,
  round(
    100.0 * count(*) filter (where event_type = 'form_submit')
    / nullif(count(*) filter (where event_type = 'modal_open'), 0),
    1
  )                                                   as conversion_pct
from resource_events
group by resource_title, resource_kind;

-- Top-level conversion rate by attribution source
create view conversion_by_source as
with traffic as (
  select
    coalesce(first_touch_utm_source, 'direct') as source,
    count(distinct anonymous_id)               as visitors
  from page_views
  group by 1
),
conversions as (
  select
    coalesce(first_touch_utm_source, 'direct') as source,
    count(distinct anonymous_id)               as leads
  from leads
  group by 1
)
select
  t.source,
  t.visitors,
  coalesce(c.leads, 0) as leads,
  round(100.0 * coalesce(c.leads, 0) / nullif(t.visitors, 0), 2) as conversion_pct
from traffic t
left join conversions c on c.source = t.source
order by t.visitors desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v2 — calculator spec v11 (run on existing deployments)
-- ─────────────────────────────────────────────────────────────────────────────
alter table calculator_submissions
  add column if not exists macro_split text,
  add column if not exists warnings    text[];
