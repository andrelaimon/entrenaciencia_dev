# Entrena con Ciencia

Landing site for Entrena con Ciencia — a science-based training and nutrition program. Built with Next.js 16, Tailwind, and Supabase for lead capture.

## Stack

- **Next.js 16** (App Router, route handlers)
- **React 19**
- **Tailwind CSS 4**
- **Framer Motion** for animations
- **Supabase** (Postgres) for lead capture
- **Vercel** for hosting

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

Create `.env.local` in the project root:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<publishable-anon-key>
```

`.env.local` is gitignored.

## Lead capture

Visitors who click a resource card on the homepage fill out a modal (name, email, WhatsApp). The submission is inserted into the Supabase `leads` table via the `/api/subscribe` route handler. The `source` column records which resource triggered the signup.

For schema, RLS configuration, and architectural notes, see [`notes.md`](./notes.md).

## Deployment

Pushing to `main` on GitHub deploys automatically to Vercel. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel project settings (Environment Variables) for all environments.

## Scripts

| Command         | What it does               |
| --------------- | -------------------------- |
| `npm run dev`   | Start the dev server       |
| `npm run build` | Production build           |
| `npm start`     | Start the production server|
| `npm run lint`  | Run ESLint                 |
