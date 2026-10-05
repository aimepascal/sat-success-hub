# SAT Hub

Simplified SAT prep and a peer community for students: bite-sized "cheat codes",
a peer forum, and an AI tutor. Free to use.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions) on Vite
- TypeScript, Tailwind CSS v4, shadcn/ui (Radix) components
- [Supabase](https://supabase.com) for auth, database, and storage
- OpenAI (via the Vercel AI SDK) for the AI features
- Installable as a PWA (service worker generated after each build)

## Getting started

You need [Node.js](https://nodejs.org) (LTS) installed.

```bash
npm install
cp .env.example .env   # then fill in the values, see below
npm run dev
```

### Environment variables

Copy `.env.example` to `.env` and fill it in. Never commit a real `.env` file.

| Variable | Used for |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | Supabase access from the server |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Supabase access from the browser (same values) |
| `OPENAI_API_KEY` | AI Tutor chat, forum AI replies, admin content generator (server-only) |

In production these are set in the hosting provider's environment variable
settings, not in a file.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build, then generate the service worker |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format the code with Prettier |

## Project structure

```
src/
  routes/         Pages (file-based routing, see src/routes/README.md)
  components/     Shared components; components/ui holds the shadcn/ui primitives
  hooks/          React hooks (auth user, admin check, mobile detection)
  integrations/   Supabase clients, auth middleware, generated database types
  lib/            Server functions (AI tutor, forum AI, admin AI) and helpers
supabase/
  migrations/     Database schema, applied in filename order
scripts/
  generate-sw.mjs Builds the PWA service worker after `npm run build`
public/           Static assets, web manifest, icons
```

## Pages

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/auth` | Sign up / log in |
| `/dashboard` | Student dashboard |
| `/vault` | Cheat Code Vault |
| `/forum`, `/forum/:postId` | Peer forum and individual posts |
| `/impact` | Community impact |
| `/admin`, `/audit-logs` | Admin tools (signed-in admins only) |
