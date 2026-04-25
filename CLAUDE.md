@AGENTS.md

## Project context

Entrena con Ciencia — a Next.js 16 landing site (Spanish) with a calorie calculator and a lead capture flow for free resources.

The "Recursos" section on the homepage uses `EmailModal.tsx` to collect name, email, and WhatsApp number, posting to `/api/subscribe` which writes to the Supabase `leads` table. PDFs are not served from the site — leads receive resources by email manually.

See `notes.md` for the full implementation overview, table schema, RLS configuration, and env vars.
