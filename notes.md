# Project notes

## Lead capture (Supabase)

The "Recursos" section on the homepage is wired to a Supabase-backed lead capture flow. There are no PDF files hosted on the site — visitors submit their info and receive the resource by email manually.

### Flow

1. Visitor clicks one of the resource cards in `ResourcesSection.tsx`.
2. `EmailModal.tsx` opens with copy specific to the card kind (`pdf` or `course`).
3. On submit (name + email + WhatsApp + consent), the browser POSTs to `/api/subscribe`.
4. The route handler (`app/api/subscribe/route.ts`) validates the payload and inserts a row into the Supabase `leads` table using the Supabase JS client.
5. The user sees a confirmation screen.

### Card kinds

- `pdf` — Guía para perder peso, Guía de consumo de proteína. Modal copy: "Te enviaremos el PDF a tu email".
- `course` — Curso (Próximamente). Modal copy: "Te avisaremos cuando el curso esté listo". Source recorded as "Curso".
- `internal` — Calculadora de calorías. Direct link, no modal.

### Supabase setup

**Table:** `leads`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        | primary key, default `gen_random_uuid()` |
| name       | text        | nullable                         |
| email      | text        | required                         |
| whatsapp   | text        | nullable                         |
| source     | text        | the card title (e.g. "Curso")    |
| created_at | timestamptz | default `now()`                  |

**RLS:** enabled, write-only access.

```sql
create policy "allow public insert"
  on leads for insert
  to public
  with check (true);

grant insert on leads to public;
```

The anon role can INSERT but has no SELECT/UPDATE/DELETE grants — even if the anon key is exposed, no one can read existing leads with it.

### Environment variables

Set in `.env.local` for local dev and in Vercel project settings for deploys:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable key — safe to use server-side in the API route)

`.env.local` is gitignored.

### Files

- `lib/supabase.ts` — Supabase JS client
- `app/api/subscribe/route.ts` — POST handler that inserts into `leads`
- `components/EmailModal.tsx` — the lead capture modal (two modes: pdf, course)
- `components/ResourcesSection.tsx` — the homepage resources grid that opens the modal

### Notes on Supabase keys

We use the anon (publishable) key, not the service role key. The new `sb_publishable_*` key format works for inserts but PostgREST returns a misleading "RLS policy violation" error on `Prefer: return=representation` requests because the anon role has no SELECT privilege. The Supabase JS client's default `.insert()` uses `return=minimal` and works without issue.

## Deployment

Hosted on Vercel. Pushing to `main` on GitHub triggers an auto-deploy.

Required Vercel env vars: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (apply to all environments).

## Analytics

Scripts are loaded in `app/layout.tsx` via `next/script` with `strategy="afterInteractive"`. They only activate when the env var is non-empty — leaving it blank disables the script entirely, so local dev is unaffected.

| Service | Env var | Where to get it |
|---|---|---|
| Google Analytics 4 | `NEXT_PUBLIC_GA_ID` | GA4 → Admin → Data Streams → Measurement ID (starts with `G-`) |
| Meta Pixel | `NEXT_PUBLIC_META_PIXEL_ID` | Meta Events Manager → Pixel → Pixel ID (numeric) |

Add to `.env.local` for local testing and to Vercel project settings for production.
