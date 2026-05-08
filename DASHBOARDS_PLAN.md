# Dashboard & Analytics Tooling Plan

A two-tool setup that gives you full funnel analytics from your Supabase data **and** marketing/ad-spend dashboards combining GA4 with ad platform data — without paying for an enterprise BI stack.

---

## Architecture

```
SUPABASE                              AD PLATFORMS + GA4
(internal funnel)                     (external traffic + spend)
       │                                      │
       ▼                                      ▼
   METABASE                             LOOKER STUDIO
   "How are people moving                "Where is traffic coming from
    through my site?"                     and what's it costing?"
```

**Metabase owns:**
- Calculator step drop-off + completion analytics
- Lead breakdown by source, country, calorie bracket, goal, obstacle
- Cohort analysis using `anonymous_id` (multi-visit journeys)
- Resource card click-to-submit conversion
- Anything answerable via SQL on Supabase

**Looker Studio owns:**
- GA4 traffic dashboards (sessions, bounce, top pages)
- Meta Ads / TikTok Ads spend, CPM, CTR, CPL
- Organic vs paid acquisition comparison
- Ad creative performance over time

**The bridge between them:** UTM parameters. Looker Studio shows what an ad campaign spent and what traffic it drove; Metabase shows what that same `first_touch_utm_campaign` actually converted to. Read side by side.

---

## Setup

### 1. Read-only Postgres user in Supabase (10 min)

Both Metabase and (optionally) Looker Studio need to query Supabase. The anon key is write-only, so create a dedicated read role. Run in the Supabase SQL editor:

```sql
create role analytics_reader login password '<choose-a-strong-password>';
grant connect on database postgres to analytics_reader;
grant usage on schema public to analytics_reader;
grant select on all tables in schema public to analytics_reader;
alter default privileges in schema public grant select on tables to analytics_reader;
```

Save the password somewhere safe.

### 2. Deploy Metabase on Railway (15 min)

1. Sign up at railway.app
2. New Project → Deploy from Template → search "Metabase"
3. ~$5/month for the compute
4. Once running, open the URL, create your admin account
5. Add data source: type **PostgreSQL**, fill in connection details from Supabase → Project Settings → Database → "Direct connection" string, but swap in `analytics_reader` username + the password you just set
6. SSL mode: `require`

### 3. Set up Looker Studio (30 min)

1. Go to lookerstudio.google.com (free with any Google account)
2. Create a new report
3. Add data sources:
   - **GA4** — native connector, takes 10 seconds once `NEXT_PUBLIC_GA_ID` is set in Vercel
   - **Meta Ads + TikTok Ads** — no native connectors, options:
     - Skip and use Meta Ads Manager / TikTok Ads Manager directly (free, recommended at low ad spend)
     - Supermetrics ($30/mo) — most popular paid connector
     - Two Minute Reports ($9/mo) — cheaper alternative
   - **(Optional) Postgres** — same `analytics_reader` credentials as Metabase

---

## Metabase dashboard — 6 starter cards

Paste these queries as new "SQL Questions" in Metabase, then arrange them on one dashboard. Metabase auto-detects the right visualization for most of these.

### Card 1 — Top-line funnel
**Visualization:** Funnel chart

```sql
select 'visitors' as stage, 1 as ord, count(distinct anonymous_id) as count from page_views
union all
select 'modal_opens', 2, count(*) from resource_events where event_type = 'modal_open'
union all
select 'leads', 3, count(*) from leads
union all
select 'calculator_completions', 4, count(*) from calculator_submissions
order by ord;
```

### Card 2 — Calculator step drop-off
**Visualization:** Funnel chart or bar chart

```sql
select
  step_reached,
  abandoned as count,
  case step_reached
    when 'intro'      then 1
    when 'screening'  then 2
    when 'form'       then 3
    when 'completed'  then 4
  end as ord
from calculator_funnel
order by ord;
```

### Card 3 — Resource card conversion
**Visualization:** Table sorted by `conversion_pct` desc

```sql
select * from resource_conversion
order by conversion_pct desc nulls last;
```

### Card 4 — Conversion by first-touch source
**Visualization:** Bar chart, sources on X axis, two series (visitors, leads), or table

```sql
select * from conversion_by_source
where visitors >= 5
order by visitors desc;
```

The `>= 5` filter cuts noise from one-off referrers.

### Card 5 — Geographic distribution
**Visualization:** Pie chart or world map

```sql
select
  coalesce(country, 'unknown') as country,
  count(distinct anonymous_id) as visitors
from page_views
group by 1
order by visitors desc
limit 20;
```

### Card 6 — Daily lead trend by source
**Visualization:** Stacked bar chart over time

```sql
select
  date_trunc('day', created_at)::date as day,
  coalesce(source, 'unknown') as source,
  count(*) as leads
from leads
where created_at >= now() - interval '30 days'
group by 1, 2
order by 1, 2;
```

---

## Bonus Metabase queries (add when relevant)

### Calculator outcomes by goal
```sql
select
  goal,
  count(*) as submissions,
  round(avg(calories)) as avg_calories,
  round(avg(tdee)) as avg_tdee,
  round(100.0 * count(*) filter (where flag_medical) / count(*), 1) as pct_with_medical_flag
from calculator_submissions
where goal is not null
group by goal
order by submissions desc;
```

### Most common obstacles
```sql
select obstacle, count(*) as submissions
from calculator_submissions
where obstacle is not null
group by obstacle
order by submissions desc;
```

### Calorie bracket distribution
```sql
select calorie_bracket, count(*) as submissions
from calculator_submissions
where calorie_bracket is not null
group by calorie_bracket
order by 1;
```

### First-touch vs last-touch attribution comparison
```sql
select
  coalesce(first_touch_utm_source, 'direct') as first_touch,
  coalesce(utm_source, 'direct')             as last_touch,
  count(*)                                   as leads
from leads
group by 1, 2
order by leads desc;
```

Reveals when a user is acquired via one channel and converts via another (e.g., Instagram → direct).

### Average days from first visit to conversion
```sql
with first_seen as (
  select anonymous_id, min(created_at) as first_visit
  from page_views
  group by anonymous_id
)
select
  source,
  count(*) as leads,
  round(avg(extract(epoch from (l.created_at - fs.first_visit)) / 86400)::numeric, 1) as avg_days_to_convert
from leads l
join first_seen fs on fs.anonymous_id = l.anonymous_id
where l.anonymous_id is not null
group by source
order by leads desc;
```

### Repeat visitor conversion rate
```sql
with vc as (
  select
    anonymous_id,
    count(distinct session_id) as session_count
  from page_views
  group by 1
)
select
  case
    when session_count = 1 then '1 session'
    when session_count between 2 and 3 then '2-3 sessions'
    else '4+ sessions'
  end as visitor_type,
  count(*) as visitors,
  count(*) filter (where exists (select 1 from leads l where l.anonymous_id = vc.anonymous_id)) as converted,
  round(100.0 * count(*) filter (where exists (select 1 from leads l where l.anonymous_id = vc.anonymous_id)) / count(*), 1) as conversion_pct
from vc
group by 1
order by 1;
```

---

## UTM tagging convention

For Metabase + Looker Studio to "talk to each other" through UTMs, every link to your site needs consistent tagging:

| Param | Value examples |
|---|---|
| `utm_source` | `instagram` \| `tiktok` \| `youtube` \| `email` |
| `utm_medium` | `social` \| `paid` \| `organic` \| `email` |
| `utm_campaign` | `guia-proteina-may` \| `lanzamiento-curso-jun` (kebab-case, descriptive) |
| `utm_content` | `reel-01` \| `story-cta-1` \| `bio-link` (specific creative) |
| `utm_term` | only used for paid search keywords |

**Use Google's URL Builder** (campaignurlbuilder.withgoogle.com) to build links — it normalizes the format and is free.

A consistently tagged Instagram reel link:
```
https://entrenaconciencia.com/?utm_source=instagram&utm_medium=social&utm_campaign=guia-proteina-may&utm_content=reel-01
```

Once tags are consistent, you can:
- See spend per campaign in Looker Studio (from Meta Ads Manager)
- See conversions per campaign in Metabase (from your data)
- Compute cost-per-lead per campaign by hand or in a third tool

---

## Cost summary

| Tool | Cost | Notes |
|---|---|---|
| Metabase on Railway | ~$5/mo | Self-hosted, $0 first month if you use Railway free credits |
| Supabase | $0 | Free tier covers ~50k rows + 500MB easily |
| Looker Studio | $0 | Google product, free forever |
| GA4 | $0 | Native connector to Looker Studio |
| Meta Ads Manager direct | $0 | Use platform's own UI for ad spend |
| TikTok Ads Manager direct | $0 | Same |
| Supermetrics (optional) | $30/mo | Only worth it once ad spend > $500/mo |
| **Minimum total** | **$5/mo** | Metabase + everything else free |
| **Full setup** | **$35/mo** | Adds unified ad spend in Looker Studio |

Compare to Triple Whale ($129+/mo), Northbeam ($1k+/mo), Tableau ($75/seat/mo).

---

## Phased rollout (recommended)

### Week 1
- Don't set up tooling yet
- Run the SQL queries above directly in the Supabase SQL editor
- Save the queries with descriptive names
- Confirm there's enough data flowing to make dashboards meaningful

### Week 2-3
- Create the `analytics_reader` Postgres role in Supabase
- Deploy Metabase on Railway
- Build the 6 starter dashboard cards
- Once these work, add the bonus queries as needed

### Week 4+
- Set up Looker Studio with GA4 only (free, native, instant)
- Build a marketing dashboard: traffic source breakdown, top landing pages, daily session trend
- Skip Supermetrics and use Meta/TikTok Ads Manager directly until ad spend > $500/mo

### 3+ months in
- If ad spend is meaningful and you want a unified marketing view, add Supermetrics or similar
- Consider adding Tier 2 events (`events` table from `data_collection_todo.MD`) to enrich Metabase analyses with behavioral signals

---

## What NOT to do

- **Don't** pay for a data warehouse (Snowflake, BigQuery) until you have >100k events/day. Supabase is your warehouse.
- **Don't** build custom Next.js admin pages unless dashboards aren't enough — you'll spend weeks rebuilding what Metabase gives you for free.
- **Don't** subscribe to Triple Whale / Northbeam / similar at this stage. They optimize for 7-figure DTC brands, not landing pages.
- **Don't** use both Metabase AND Looker Studio for the same data — pick one source of truth per question. Metabase for "what happened on my site," Looker Studio for "what happened with my ads/traffic."
